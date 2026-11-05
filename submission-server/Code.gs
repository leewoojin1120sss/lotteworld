// Set FOLDER_ID in this project's Script properties. Do not make the folder public.
function doPost(e) {
  let requestId = '';
  let result;
  try {
    const data = JSON.parse(e.postData.contents);
    requestId = String(data.requestId || '');
    if (!/^[a-f0-9]{32}$/.test(requestId)) throw new Error('제출 번호가 올바르지 않습니다.');
    const name = String(data.name || '').trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_');
    if (!name || name.length > 40 || typeof data.final !== 'boolean') throw new Error('이름과 최종 제출 여부를 확인해 주세요.');
    if (typeof data.image !== 'string' || data.image.length > 16000000) throw new Error('이미지 크기가 너무 큽니다.');
    const bytes = Utilities.base64Decode(data.image);
    const png = [137,80,78,71,13,10,26,10];
    if (bytes.length < 8 || !png.every((x,i)=>(bytes[i]&255)===x)) throw new Error('PNG 이미지가 아닙니다.');
    const folderId = PropertiesService.getScriptProperties().getProperty('FOLDER_ID');
    if (!folderId) throw new Error('FOLDER_ID가 설정되지 않았습니다.');
    const stamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd_HHmmss');
    const filename = name+'_'+(data.final?'최종':'중간')+'_'+stamp+'_'+Utilities.getUuid().slice(0,8)+'.png';
    DriveApp.getFolderById(folderId).createFile(Utilities.newBlob(bytes,'image/png',filename));
    result = {ok:true,filename:filename};
  } catch(err) {
    result = {ok:false,error:String(err.message||err)};
  }
  if (/^[a-f0-9]{32}$/.test(requestId)) {
    try { CacheService.getScriptCache().put('receipt:'+requestId,JSON.stringify(result),600); } catch (_) {}
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// A random submission ID lets the site retrieve only the outcome, not photos.
function doGet(e) {
  const p = e.parameter || {};
  if (p.check === '1') {
    try {
      const folderId = PropertiesService.getScriptProperties().getProperty('FOLDER_ID');
      if (!folderId) throw new Error('FOLDER_ID가 설정되지 않았습니다.');
      DriveApp.getFolderById(folderId).getId();
      return ContentService.createTextOutput('저장 폴더에 접근할 수 있습니다.');
    } catch (err) {
      return ContentService.createTextOutput('저장 폴더 설정 확인 필요: '+String(err.message || err));
    }
  }
  const callback = String(p.callback || ''), id = String(p.id || '');
  if (!/^__missionReceipt_[a-f0-9]{32}$/.test(callback) || !/^[a-f0-9]{32}$/.test(id)) {
    return ContentService.createTextOutput('Invalid request');
  }
  let result;
  try {
    const saved = CacheService.getScriptCache().get('receipt:'+id);
    result = saved ? JSON.parse(saved) : {pending:true};
  } catch (_) { result = {pending:true}; }
  return ContentService.createTextOutput(callback+'('+JSON.stringify(result)+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}

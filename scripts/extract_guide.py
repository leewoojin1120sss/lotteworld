"""Build exact floor artwork and indexed pins from the user supplied 2026 guide.

Development dependencies: pymupdf, Pillow, numpy. No OCR or invented locations.
Usage: python scripts/extract_guide.py /path/to/2026-guide.pdf
"""
from pathlib import Path
import sys, json, math
import fitz
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PDF = fitz.open(sys.argv[1])
# Coordinates below are PDF points. Upper floors share page 3 and are masked
# along the whitespace between drawings, so a neighbouring floor never leaks in.
FLOORS = [
    dict(id='B1', label='B1', name='언더랜드', page=0, crop=[660,130,1555,810], bg='#fffaf7'),
    dict(id='1F', label='1F', name='어드벤처 1층', page=1, crop=[300,45,1425,805], bg='#fffafd'),
    dict(id='2F', label='2F', name='어드벤처 2층', page=2, crop=[160,120,980,460], bg='#fffdf4', polygon=[[160,120],[980,120],[980,420],[870,425],[800,385],[715,365],[630,355],[530,390],[420,410],[320,425],[230,460],[160,460]]),
    dict(id='3F', label='3F', name='어드벤처 3층', page=2, crop=[600,325,1415,610], bg='#fffdf4', polygon=[[600,460],[980,420],[1050,325],[1415,325],[1415,610],[600,610]]),
    dict(id='4F', label='4F', name='어드벤처 4층', page=2, crop=[1030,475,1880,815], bg='#fffdf4', polygon=[[1030,610],[1415,610],[1430,475],[1880,475],[1880,815],[1030,815]]),
    dict(id='MAGIC', label='매직', name='매직아일랜드', page=3, crop=[295,25,1125,805], bg='#ffffff'),
]

RIDES = [
('드림보트','신비한 요정의 숲으로 떠나는 판타지 보트 라이드'),
('4D슈팅씨어터','4D로 즐기는 짜릿한 슈팅 어드벤처'),
('와일드밸리','보트를 타고 급류를 지나는 미스터리 동굴 모험'),
('와일드정글','지프차를 타고 고대 유적을 찾아 떠나는 신전 탐험'),
('와일드윙','강렬한 바람을 가르며 하늘을 비행하는 아찔한 체험'),
('신밧드의 모험','보트를 타고 떠나는 지하 속 신밧드의 모험 이야기'),
('스페인해적선','75도 각도까지 올라가는 스릴 넘치는 해적선'),
('후룸라이드','보트를 타고 급류에 밀려 폭포에서 떨어지는 스릴'),
('회전바구니','손잡이를 돌릴수록 빠르게 회전하는 바구니'),
('로티트레인','꼬마 기차를 타고 떠나는 어드벤처 한바퀴'),
('배틀그라운드','적들에게 맞서 생존을 위한 섬 탈출기, 워크스루 슈팅 시어터'),
('플라이벤처','플라잉머신을 타고 떠나는 시공간 초월 비행'),
('회전목마','64필의 아름다운 백마를 타고 보내는 로맨틱한 시간'),
('황야의 무법자','서부시대 보안관이 되어 악당을 물리치는 슈팅 배틀'),
('키즈토리아','맨발로 뛰어놀 수 있는 거대한 동화 속 세상'),
('드래곤 와일드슈팅','로티성에 쳐들어온 드래곤들을 슈팅건으로 무찔러봐요'),
('어린이 범퍼카','뛰뛰빵빵, 어린이들을 위한 범퍼카'),
('햇님달님','햇님달님 오누이와 하늘 위로 점프'),
('점핑피쉬','무서운 상어를 피해 빙글빙글 점프하는 물고기'),
('언더씨킹덤','맨발로 뛰어놀 수 있는 바다왕국 놀이터'),
('유레카','하늘을 나는 꼬마 요술배'),
('스윙팡팡','위아래로 통통 튀기는 바구니'),
('매직붕붕카','좌충우돌 색색깔의 복어범퍼카'),
('어린이 동화극장','어린이 뮤지컬이 펼쳐지는 극장'),
('카트라이더','롯데월드에서 즐기는 카트라이더 레이싱'),
('후렌치레볼루션','어드벤처 실내를 질주하는 롤러코스터'),
('범퍼카','앞에서 쾅, 뒤에서 쾅! 좌충우돌 범퍼카'),
('콩X고질라: 더 라이드','히브 비행선을 타고 콩X고질라와 미지의 세계로'),
('월드모노레일','로티, 로리로 변신한 모노레일을 타고 어드벤처 한바퀴'),
('풍선비행','열기구를 타고 하늘 위에서 바라보는 어드벤처'),
('파라오의 분노','파라오의 보물을 찾아 떠나는 스릴 만점 다크 라이드'),
('어크로스다크','잃어버린 유물을 찾아 우주로 떠나는 모험'),
('아트란티스','급발진하는 보트를 타고 미스터리 신전 속으로'),
('자이로스윙','석촌호수에 떨어질 듯 말 듯 아찔한 스윙'),
('쁘띠빵빵','호숫가를 드라이브하는 귀여운 자동차'),
('자이로드롭','상공 70m 높이에서 자유낙하하는 공포와 스릴'),
('환타지드림','꼬마 기차를 타고 떠나는 동화 속 세상'),
('혜성특급','좌석이 회전하는 열차를 타고 떠나는 어둠 속 우주여행'),
('자이로스핀','거대한 나침반을 타고 돌고 도는 아찔한 서핑타임'),
('스톤익스프레스','돌의 정령을 따라 핑크빈을 찾아 떠나는 모험'),
('아르카나라이드','정령의 나무를 치유하러 떠나는 마법여행'),
('에오스타워','타워 꼭대기를 열어 핑크빈을 찾아 떠나는 모험'),
]
FOOD = {
'B1': [('도미노피자','피자, 치킨, 파스타'),('츄로빅','수제 츄러스, 커피, 쉐이크'),('롯데리아','햄버거, 감자튀김, 치킨'),('유브유부','유부초밥, 우동, 라면, 떡볶이'),('101번지 남산돈까스','돈까스, 우동'),('잇츠월드','함박스테이크, 돈코츠 라멘, 젤라또 아이스크림')],
'1F': [('스쿨푸드','스팸마리, 장조림버터비빔밥, 김계떡'),('BHC','콜팝'),('스낵산호세','츄러스, 그릴소시지, 핫도그'),('팝콘팩토리','팝콘'),('투썸플레이스','커피, 프라페, 주스, 마카롱'),('칠링스테이션','타코, 퀘사디아, 마가리따'),('아라비안바자','츄러스, 그릴소시지, 핫도그'),('오마스딜라이트','오레오 츄러스, 쉐이크'),('더쓰리위시스','한식, 중식, 분식 푸드코트'),('폴바셋','아이스크림라떼, 소잘라떼, 룽고커피'),('매드포갈릭','파스타, 함박스테이크, 피자'),('버거베어','수제버거, 떡볶이, 카페 푸드코트'),('롯데리아','햄버거, 감자튀김, 치킨'),('모찌이야기','과일모찌, 탕후루'),('델리쉐프','점보호두과자, 슬러시, 밀크티, 츄러스'),('파스퇴르밀크바','아이스크림, 그릭요거트, 밀크쉐이크'),('설빙','빙수, 토스트, 커피')],
'2F': [('라인랜드 후르츠월드','츄러스, 젤라또 아이스크림'),('퀴즈노스','샌드위치, 핫도그'),('빈슈트루델','소프트아이스크림, 젤라또'),('앤티앤스프레즐','프레즐, 시나몬스틱, 에이드'),('델리본','감자튀김, 와플, 스무디'),('오이씨푸드','라멘, 우동, 돈까스, 볶음밥'),('델키스','케밥, 핫도그, 치킨, 에이드'),('공차','밀크티, 버블티'),('김피라','떡볶이, 라면, 퓨전 분식'),('상하이','짜장면, 짬뽕, 탕수육'),('요거트월드','요거트아이스크림, 그릭요거트'),('라라코스트','파스타, 피자, 커틀렛, 필라프'),('부창제과','호두과자'),('아이스팩토리','스틱 아이스크림')],
'3F': [('엠테이블','짜장면, 돈카츠, 로코모코'),('비스트 스테이션 / 타이탄스낵','비스트 젤라또, 타이탄 소프트콘')],
'4F': [('오벨리스크','생크림와플, 소떡소떡, 핫바, 츄러스, 구슬아이스크림'),('뉴욕핫도그','핫도그, 에이드'),('파라오스낵','떡볶이, 만두, 소시지, 소프트아이스크림')],
'MAGIC': [('모리스딜라이트','아이스 딸기 탕후루, 크라페'),('투썸플레이스','커피, 프라페, 주스'),('와플대학','와플, 젤라또 아이스크림, 에이드'),('BHC','콜팝, 치킨'),('공차','밀크티, 버블티'),('짤즈빵젤라또','소금빵 젤라또'),('레이크뷰 매드포갈릭','팝콜, 치즈포테이토, 소시지'),('캔디캐슬','자이로츄러스, 떡볶이, 감자튀김'),('BBQ빌리지','치킨, 통다리구이, 윙'),('스쿨푸드','김치볶음밥, 떡볶이, 돈까스, 라면'),('메이플스위츠','메이플스토리 카페 & 베이커리')],
}
SHOPS = [('환타지기프트샵','캐릭터 상품, 헤어밴드, 가방'),('픽시매직','교복 대여, 특수 분장'),('샤론캣프리미엄라운지','프리미엄 드레스 대여, 퍼레이드 연기자 체험'),('샤론캣드레스','드레스 대여 및 퍼레이드 연기자 체험'),('로티스엠포리움','대형 캐릭터 상품샵'),('위니비니','캔디, 초콜릿, 젤리'),('포토스트리트','다양한 컨셉의 포토부스'),('툼오브호러','좀비 공포 체험'),('사진상점','사진촬영, 인화 및 카메라 대여'),('토이플러스','캐릭터 상품, 완구, 풍선'),('위니비니','캔디, 초콜릿, 젤리'),('타로카드','타로 카드 점괘'),('오픈예정','2026 가이드맵에 오픈예정으로 기재'),('콩X고질라 더 라이드 SHOP','콩X고질라: 더 라이드 굿즈샵'),('게임빌리지','비디오 게임 오락실'),('전망대게임장','인형뽑기 오락실'),('헬로키티','헬로키티 기프트샵'),('파라오짱게임즈','대형 오락실'),('매직캐슬트래져스','캐릭터 상품샵'),('문보트','문보트, UFO 보트 체험'),('메이플스토어','메이플스토리 굿즈샵')]

FACILITIES = {'화장실':'restroom','계단':'stairs','엘리베이터':'elevator','에스컬레이터':'escalator','의무실':'firstaid','포토스팟':'photo','휠체어대여소':'wheelchair','음수대':'water','미아보호소':'lostchild','분실물보관소':'lostfound','베이비라운지':'baby','여성용품':'sanitary','유모차대여소':'stroller','물품보관함':'locker','손님상담실':'info','현금지급기':'atm','보조배터리 대여장소':'battery','자동심장 충격기':'aed','자동심장 충격기(AED)':'aed','자동심장충격기(AED)':'aed','무슬림기도실':'prayer','흡연실':'smoking'}

def spans(page):
    return [s for b in page.get_text('dict', flags=fitz.TEXTFLAGS_TEXT)['blocks'] for l in b.get('lines',[]) for s in l['spans']]

def floor_at(page, x, y):
    if page != 2: return {0:'B1',1:'1F',3:'MAGIC'}.get(page)
    if x < 980 and (x < 600 or y < 420): return '2F'
    if y < 610 and (x < 1415): return '3F'
    return '4F'

rendered={i: Image.frombytes('RGB', [px.width,px.height],px.samples) for i in range(4) for px in [PDF[i].get_pixmap(matrix=fitz.Matrix(2,2))]}
image_infos={i:PDF[i].get_image_info() for i in range(4)}
floor_by_id={f['id']:f for f in FLOORS}
all_pins=[]
colors={'attraction':[(137,59,18),(230,0,18),(255,153,0),(0,155,64),(117,0,148),(0,76,189)],'food':[(220,0,134)],'shop':[(117,0,255)]}
for pi in range(4):
    for s in spans(PDF[pi]):
        if s['color'] != 16777215 or not s['text'].strip().isdigit() or s['size']<11.5 or s['bbox'][1]>810: continue
        x0,y0,x1,y1=s['bbox'];x=(x0+x1)/2;y=(y0+y1)/2
        if pi==0 and x<660:continue
        arr=np.asarray(rendered[pi].crop(tuple(round(v*2) for v in [x0-4,y0-2,x1+4,y1+2]))).astype(float)
        scores={k:max(float(np.mean(np.linalg.norm(arr-np.array(c),axis=2)<55)) for c in cs) for k,cs in colors.items()}
        category=max(scores,key=scores.get); n=int(s['text']);fid=floor_at(pi,x,y)
        all_pins.append(dict(category=category,number=n,floor=fid,pdf=[round(x,2),round(y,2)]))

# Numbered indexes carry all the authoritative catalogue entries, even if the
# source page omits a map number. Never invent a location for those entries.
pois=[]
for n,(name,description) in enumerate(RIDES,1):
    fid='B1' if n<=5 else '1F' if n<=25 else '2F' if n<=27 else '3F' if n<=29 else '4F' if n<=32 else 'MAGIC'
    pois.append(dict(id=f'ride-{n}',number=n,name=name,description=description,category='attraction',floor=fid))
for fid,entries in FOOD.items():
    start={'B1':1,'1F':7,'2F':24,'3F':38,'4F':40,'MAGIC':41}[fid]
    for n,(name,description) in enumerate(entries,start): pois.append(dict(id=f'food-{fid}-{n}',number=n,name=name,description=description,category='food',floor=fid))
for n,(name,description) in enumerate(SHOPS,1):
    fid='B1' if n<=3 else '1F' if n<=10 else '2F' if n<=13 else '3F' if n<=15 else '4F' if n<=18 else 'MAGIC'
    pois.append(dict(id=f'shop-{n}',number=n,name=name,description=description,category='shop',floor=fid))
for p in pois:
    pins=[a for a in all_pins if (a['category'],a['floor'],a['number'])==(p['category'],p['floor'],p['number'])]
    if pins:
        p['pdf']=pins[0]['pdf']
        if len(pins)>1:
            p['alternatePDF']=[a['pdf'] for a in pins[1:]]
            p['note']='원본 지도에 같은 번호가 두 곳 표시되어 있습니다. 어느 곳이 16번 전망대게임장 또는 17번 헬로키티인지 현장 표지로 확인해 주세요.'
    else:p['note']='원본의 목록에는 있으나 지도 번호가 누락되어 정확한 핀 위치를 표시하지 않습니다.'

templates=[]
# Match the public guide's repeated inline icon artwork against its own legend.
# Icon positions come from PDF image boxes; semantic labels come from legend text.
for pi in range(4):
    ss=spans(PDF[pi]); ins=image_infos[pi]
    for s in ss:
        txt=s['text'].strip()
        if txt not in FACILITIES:continue
        x0,y0,x1,y1=s['bbox']
        if x0 < (1200 if pi==3 else 1600):continue
        cy=(y0+y1)/2
        near=[im for im in ins if 14<im['bbox'][2]-im['bbox'][0]<31 and 14<im['bbox'][3]-im['bbox'][1]<31 and abs((im['bbox'][1]+im['bbox'][3])/2-cy)<12 and 0<x0-im['bbox'][2]<25]
        if not near:continue
        b=max(near,key=lambda im:im['bbox'][2]-im['bbox'][0])['bbox']
        templates.append((FACILITIES[txt],txt,pi,list(b)))

def sample(pi,b):
    # Use colour and silhouette together, keeping the black outer border.
    return np.asarray(rendered[pi].crop(tuple(round(v*2) for v in b)).resize((28,28))).astype(float)/255

template_samples=[(k,n,sample(pi,b)) for k,n,pi,b in templates]
fac_pins=[]
for pi in range(4):
    candidates=[]
    for im in image_infos[pi]:
        b=list(im['bbox']);w=b[2]-b[0];h=b[3]-b[1]
        if not (16<=w<=29 and 16<=h<=29):continue
        x=(b[0]+b[2])/2;y=(b[1]+b[3])/2
        fid=floor_at(pi,x,y); f=floor_by_id[fid];c=f['crop']
        if not (c[0]<=x<=c[2] and c[1]<=y<=c[3]):continue
        if any(math.hypot(x-v[0],y-v[1])<4 for v in candidates):continue
        a=sample(pi,b)
        yellow=(a[:,:,0]>.78)&(a[:,:,1]>.65)&(a[:,:,2]<.78)
        red=(a[:,:,0]>.65)&(a[:,:,1]<.35)&(a[:,:,2]<.4)
        white=(a.min(axis=2)>.85)
        if np.mean(yellow)<.22 and not (np.mean(red)>.1 and np.mean(white)>.25):continue
        candidates.append([x,y])
        # Translation tolerance for 1-point shadow/overprint boxes.
        def distance(t):
            ta=t[2]
            return min(float(np.mean((a[3:25,3:25]-np.roll(np.roll(ta,dy,0),dx,1)[3:25,3:25])**2)) for dy in [-1,0,1] for dx in [-1,0,1])
        best=min(template_samples,key=distance)
        if distance(best)>.12:continue
        if distance(best)>.05:best=('unknown','기타 편의시설',best[2])
        if best[0]=='aed':best=('aed','자동심장충격기(AED)',best[2])
        fac_pins.append(dict(category='facility',kind=best[0],name=best[1],floor=fid,pdf=[round(x,2),round(y,2)],match=round(distance(best),4),box=b))

for j,p in enumerate(fac_pins):
    p['id']=f"facility-{p['floor']}-{p['kind']}-{sum(1 for a in fac_pins[:j] if (a['floor'],a['kind'])==(p['floor'],p['kind']))+1}"
    p['description']='2026 공식 가이드맵에 표시된 편의시설입니다.'
    pois.append({k:v for k,v in p.items() if k not in ['match','box']})

for p in pois:
    f=floor_by_id[p['floor']];c=f['crop']
    if 'pdf' in p:p['x']=round((p['pdf'][0]-c[0])/(c[2]-c[0])*1000,3);p['y']=round((p['pdf'][1]-c[1])/(c[3]-c[1])*1000,3)
    else:p['x']=None;p['y']=None
    p['source']='guide-2026';p['coordinateQuality']='guide-illustration' if p['x'] is not None else 'unlocated'

assets=ROOT/'assets/maps';assets.mkdir(parents=True,exist_ok=True)
for f in FLOORS:
    c=f['crop'];im=rendered[f['page']].crop(tuple(v*2 for v in c))
    if f['id']=='1F':
        # Remove only the clipped page-title fragment outside the floor artwork.
        ImageDraw.Draw(im).rectangle([0,0,(500-c[0])*2,(175-c[1])*2],fill=rendered[1].getpixel((800,60)))
    if f['id']=='2F':
        ImageDraw.Draw(im).rectangle([0,0,(600-c[0])*2,(180-c[1])*2],fill=rendered[2].getpixel((1100,100)))
    if 'polygon' in f:
        mask=Image.new('L',im.size);ImageDraw.Draw(mask).polygon([((x-c[0])*2,(y-c[1])*2) for x,y in f['polygon']],fill=255)
        back=Image.new('RGB',im.size,f['bg']);back.paste(im,(0,0),mask);im=back
    im.save(assets/f"{f['id']}.webp",'WEBP',quality=91,method=6)
    f['image']=f"assets/maps/{f['id']}.webp";f['width']=c[2]-c[0];f['height']=c[3]-c[1]
    if (assets/f"{f['id']}.svg").exists():
        f['vectorImage']=f"assets/maps/{f['id']}.svg"
    f['positionMode']='manual-or-estimated'

out={'title':'롯데월드야호','guideYear':2026,'sourceName':'2026 가이드맵_국문_FS2.pdf','floors':FLOORS,'pois':pois,'notes':['가이드맵은 기울어진 조감도이며 측량 도면이 아닙니다.','1F 푸드 22번은 목록에만 기재되어 핀을 만들지 않았습니다.','4F 기프트샵의 17번 중복 및 16번 누락은 원본 표기를 보존합니다.','4F 어크로스다크는 5쪽 목록과 지도 핀 기준 32번으로 통일합니다.']}
(ROOT/'data').mkdir(exist_ok=True)
(ROOT/'data/park.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
# Development contact sheet: verify each extracted icon against its human label.
sheet=Image.new('RGB',(950,math.ceil(len(fac_pins)/12)*88),'white');d=ImageDraw.Draw(sheet)
for i,p in enumerate(fac_pins):
    xx=(i%12)*79;yy=(i//12)*88
    im=rendered[floor_by_id[p['floor']]['page']].crop(tuple(round(v*2) for v in p['box'])).resize((44,44))
    sheet.paste(im,(xx,yy));d.text((xx,yy+45),f"{i} {p['floor']}",fill='black');d.text((xx,yy+60),p['kind'][:11],fill='black')
sheet.save('/tmp/lotte-pdf/facilities-contact.png')
Path('/tmp/lotte-pdf/icon-audit.json').write_text(json.dumps(fac_pins,ensure_ascii=False,indent=2))
print('Numbered map pins:',len(all_pins),'Facilities:',len(fac_pins),'POIs:',len(pois))
print('Templates:',[(k,pi) for k,n,pi,b in templates])
print('Unlocated:',[(p['floor'],p.get('number'),p['name']) for p in pois if p['x'] is None])
print('Category counts:',{k:sum(p['category']==k for p in pois) for k in ['attraction','food','shop','facility']})

"""Audit each guide pin against original PDF symbol geometry (read-only).

python scripts/audit_coordinates.py /path/to/guide.pdf --output /tmp/audit
No web-map pixels or geographic coordinates are mixed with PDF coordinates.
"""
from pathlib import Path
from collections import Counter
import argparse,hashlib,json,math
import fitz
import numpy as np
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[1]
COLORS={'attraction':[(122,37,0),(229,0,18),(242,115,0),(0,155,63),(118,0,147),(0,77,188)],'food':[(220,0,134)],'shop':[(117,0,255)]}
def distance(a,b):return math.hypot(a[0]-b[0],a[1]-b[1])
def center(rect):return [(rect[0]+rect[2])/2,(rect[1]+rect[3])/2]
def inside(p,f):
 c=f['crop'];x,y=p
 if not(c[0]<=x<=c[2] and c[1]<=y<=c[3]):return False
 if 'polygon' not in f:return True
 hit=False
 for a,b in zip(f['polygon'],f['polygon'][1:]+f['polygon'][:1]):
  if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:hit=not hit
 return hit

def main():
 ap=argparse.ArgumentParser();ap.add_argument('pdf',type=Path);ap.add_argument('--output',type=Path,required=True);args=ap.parse_args();args.output.mkdir(parents=True,exist_ok=True)
 park=json.loads((ROOT/'data/park.json').read_text());doc=fitz.open(args.pdf);floors={f['id']:f for f in park['floors']}
 spans={};drawings={};images={};renders={}
 for pi in range(4):
  pg=doc[pi];spans[pi]=[s for b in pg.get_text('dict',flags=fitz.TEXTFLAGS_TEXT)['blocks'] for l in b.get('lines',[]) for s in l['spans']]
  drawings[pi]=pg.get_drawings();images[pi]=pg.get_image_info(hashes=True)
  pix=pg.get_pixmap(matrix=fitz.Matrix(3,3));renders[pi]=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
 findings=[];unresolved=[]
 for p in park['pois']:
  f=floors[p['floor']];pi=f['page']
  if not p.get('pdf'):
   unresolved.append({'id':p['id'],'floor':p['floor'],'name':p['name'],'reason':'no unambiguous number in original guide'});continue
  for location_index,old in enumerate([p['pdf']]+p.get('alternatePDF',[])):
   if p['category']!='facility':
    text=[s for s in spans[pi] if s['text'].strip()==str(p.get('sourceGuideNumber',p['number'])) and s['color']==16777215 and distance(center(s['bbox']),old)<4]
    assert len(text)==1,(p['id'],old,'glyph must match exactly once')
    text=text[0];candidates=[]
    for d in drawings[pi]:
     fill=d.get('fill');b=d['rect']
     if not fill or not b.contains(fitz.Point(*old)) or not(7<b.width<40 and 7<b.height<40):continue
     delta=min(math.dist([v*255 for v in fill],c) for c in COLORS[p['category']])
     if delta<35:candidates.append((delta,b.get_area(),d))
    assert candidates,(p['id'],'colored source symbol missing')
    # Smallest containing category-colored shape identifies this number's body.
    d=min(candidates,key=lambda a:(a[0],a[1]))[2];colored=d['rect'];bounds=list(colored)
    outlines=[a for a in drawings[pi] if a.get('fill') and min(a['fill'])>.99 and abs(a.get('seqno',0)-d.get('seqno',0))<6 and a['rect'].contains(colored) and a['rect'].width<colored.width*1.7 and a['rect'].height<colored.height*2 and distance(center(a['rect']),center(colored))<3]
    if outlines:bounds=list(min(outlines,key=lambda a:a['rect'].get_area())['rect'])
    new=center(bounds)
    evidence={'type':'pdf-vector-symbol','page':pi+1,'number':p['number'],'textBounds':[round(v,5) for v in text['bbox']],'symbolBounds':[round(v,5) for v in bounds],'drawSequence':d.get('seqno'),'fillRGB':[round(v,4) for v in d['fill']]}
   else:
    candidates=[im for im in images[pi] if 14<im['bbox'][2]-im['bbox'][0]<32 and 14<im['bbox'][3]-im['bbox'][1]<32 and distance(center(im['bbox']),old)<3]
    assert candidates,(p['id'],'facility source image missing')
    # Later image is the visible foreground icon, rather than its shadow.
    im=max(candidates,key=lambda a:a['number']);bounds=list(im['bbox']);new=center(bounds)
    evidence={'type':'pdf-foreground-icon','page':pi+1,'symbolBounds':[round(v,5) for v in bounds],'imageNumber':im['number'],'imageDigest':im['digest'].hex(),'nativePixels':[im['width'],im['height']],'kind':p['kind']}
   new=[round(v,5) for v in new];assert inside(new,f),(p['id'],'corrected point outside floor')
   findings.append({'id':p['id'],'name':p['name'],'category':p['category'],'floor':p['floor'],'locationIndex':location_index,'oldPDF':old,'pdf':new,'deltaPDFPoints':round(distance(old,new),5),'evidence':evidence})
 # Independently inventory visible yellow/AED image clusters to detect omissions.
 source_facilities=[];number_shadows=[]
 for f in park['floors']:
  pi=f['page'];groups=[]
  for im in images[pi]:
   b=im['bbox'];xy=center(b)
   if not(16<=b[2]-b[0]<=29 and 16<=b[3]-b[1]<=29 and inside(xy,f)):continue
   group=next((g for g in groups if distance(center(g[-1]['bbox']),xy)<3),None)
   if group is None:groups.append([im])
   else:group.append(im)
  for group in groups:
   im=max(group,key=lambda a:a['number']);b=im['bbox'];xy=center(b)
   a=np.asarray(renders[pi].crop(tuple(round(v*3) for v in b))).astype(float)/255
   yellow=(a[:,:,0]>.78)&(a[:,:,1]>.65)&(a[:,:,2]<.78);red=(a[:,:,0]>.65)&(a[:,:,1]<.35)&(a[:,:,2]<.4);white=a.min(axis=2)>.85
   if yellow.mean()<.22 and not(red.mean()>.1 and white.mean()>.25):continue
   number=[r for r in findings if r['floor']==f['id'] and r['category']!='facility' and distance(r['pdf'],xy)<3]
   if number:
    number_shadows.append({'floor':f['id'],'imageNumber':im['number'],'numberId':number[0]['id']});continue
   near=[r for r in findings if r['floor']==f['id'] and r['category']=='facility' and distance(r['pdf'],xy)<3]
   source_facilities.append({'floor':f['id'],'pdf':xy,'ids':[r['id'] for r in near],'imageNumber':im['number']})
 report={'source':{'name':args.pdf.name,'sha256':hashlib.sha256(args.pdf.read_bytes()).hexdigest(),'coordinateSystem':'PDF points in original page; floor display uses normalized 0..1000','pointRole':'guide symbol center, not surveyed entrance'},'summary':{'poiCount':len(park['pois']),'locatedPois':len({r['id'] for r in findings}),'symbolLocations':len(findings),'numberedLocations':sum(r['category']!='facility' for r in findings),'facilityLocations':sum(r['category']=='facility' for r in findings),'unlocatedPois':len(unresolved),'independentFacilityGlyphs':len(source_facilities),'unmatchedFacilityGlyphs':sum(not r['ids'] for r in source_facilities),'maxDeltaPDFPoints':max(r['deltaPDFPoints'] for r in findings)},'locations':findings,'unresolved':unresolved,'facilityInventory':source_facilities,'rejectedNumberShadows':number_shadows}
 (args.output/'audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 for category in ['numbered','facility']:
  rows=[r for r in findings if (r['category']=='facility')==(category=='facility')];cols=10;sheet=Image.new('RGB',(1200,math.ceil(len(rows)/cols)*125),'white');dr=ImageDraw.Draw(sheet)
  for i,row in enumerate(rows):
   x,y=row['pdf'];pi=row['evidence']['page']-1;ax=i%cols*120;ay=i//cols*125
   crop=renders[pi].crop(tuple(round(v*3) for v in [x-18,y-18,x+18,y+18]));sheet.paste(crop,(ax+6,ay));dr.line([(ax+54,ay+54),(ax+66,ay+54)],fill='blue',width=1);dr.line([(ax+60,ay+48),(ax+60,ay+60)],fill='blue',width=1)
   dr.text((ax+3,ay+108),row['id'].replace('facility-','')[:20],fill='black')
  sheet.save(args.output/f'{category}-verified.png')
 print(json.dumps(report['summary'],ensure_ascii=False));print('unmatched', [r for r in source_facilities if not r['ids']])

if __name__=='__main__':main()

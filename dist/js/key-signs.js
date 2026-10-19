// Key symbols identify barriers, independently of every wagon's number or color.
export const KEY_SIGNS=Object.freeze([
 Object.freeze({name:'Güneş',icon:'sun',color:'#956820'}),
 Object.freeze({name:'Ay',icon:'moon',color:'#387984'}),
 Object.freeze({name:'Yıldız',icon:'star',color:'#87539c'})
]);
export const keySign=id=>KEY_SIGNS[id-1];

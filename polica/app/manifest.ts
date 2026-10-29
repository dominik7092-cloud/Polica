import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest{return{name:'Polica',short_name:'Polica',description:'Paid store missions across Europe',start_url:'/en',display:'standalone',background_color:'#f5f6ef',theme_color:'#10221d',icons:[{src:'/icon.svg',sizes:'any',type:'image/svg+xml'}]}}

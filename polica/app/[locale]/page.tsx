import {redirect} from 'next/navigation';export default function P({params}:{params:{locale:string}}){redirect(`/${params.locale}/jobs`)}

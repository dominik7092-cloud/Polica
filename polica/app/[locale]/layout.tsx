import {NextIntlClientProvider} from 'next-intl';import {getMessages} from 'next-intl/server';import {Shell} from '@/components/shell';
export default async function L({children,params}:{children:React.ReactNode;params:{locale:string}}){const messages=await getMessages();return <NextIntlClientProvider messages={messages}><Shell locale={params.locale}>{children}</Shell></NextIntlClientProvider>}

import {twMerge} from 'tailwind-merge';import type {ButtonHTMLAttributes,HTMLAttributes} from 'react';
export function Card({className,...p}:HTMLAttributes<HTMLDivElement>){return <div className={twMerge('rounded-[28px] border border-black/5 bg-white shadow-soft',className)} {...p}/>}
export function Button({className,...p}:ButtonHTMLAttributes<HTMLButtonElement>){return <button className={twMerge('rounded-2xl bg-ink px-5 py-3.5 font-semibold text-white transition active:scale-[.98] disabled:opacity-40',className)} {...p}/>}
export function Chip({children,className}:{children:React.ReactNode,className?:string}){return <span className={twMerge('inline-flex rounded-full bg-ink/5 px-3 py-1.5 text-xs font-semibold',className)}>{children}</span>}

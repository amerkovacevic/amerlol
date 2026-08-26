"use client"
import * as React from "react"
export const SECRET_IDS = ["konami", "broken404", "terminal", "snake", "falseHope"] as const
export type SecretId = (typeof SECRET_IDS)[number]
type SecretState = Record<SecretId, boolean> & { snakeHighScore: number; completed: boolean }
const STORAGE_KEY = "amer.lol:404-secrets"
const EMPTY_STATE: SecretState = { konami:false, broken404:false, terminal:false, snake:false, falseHope:false, snakeHighScore:0, completed:false }
function readState(): SecretState {
  try { const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}"); return {...EMPTY_STATE,...Object.fromEntries(SECRET_IDS.map(id=>[id,v[id]===true])),snakeHighScore:Number.isFinite(v.snakeHighScore)?Math.max(0,v.snakeHighScore):0,completed:v.completed===true} }
  catch { return EMPTY_STATE }
}
export function useSecrets(onUnlock:(id:SecretId)=>void) {
  const [state,setState]=React.useState<SecretState>(EMPTY_STATE); const [hydrated,setHydrated]=React.useState(false)
  React.useEffect(()=>{setState(readState());setHydrated(true)},[])
  const persist=(next:SecretState)=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next))}catch{/* Optional storage. */}}
  const unlock=React.useCallback((id:SecretId)=>setState(current=>{if(current[id])return current;const next={...current,[id]:true};persist(next);queueMicrotask(()=>onUnlock(id));return next}),[onUnlock])
  const setHighScore=React.useCallback((score:number)=>setState(current=>{if(score<=current.snakeHighScore)return current;const next={...current,snakeHighScore:score};persist(next);return next}),[])
  const markCompleted=React.useCallback(()=>setState(current=>{const next={...current,completed:true};persist(next);return next}),[])
  return {state,count:SECRET_IDS.filter(id=>state[id]).length,hydrated,unlock,setHighScore,markCompleted}
}

'use client'

import { useEffect, useState } from 'react'
import { fetchMarqueeMessages } from '@/lib/api/storefront'

type MarqueeMessage = {
  text: string
  highlight: boolean
}

export default function CenterMarquee() {
  const [messages, setMessages] = useState<MarqueeMessage[]>([])

  useEffect(() => {
    fetchMarqueeMessages().then(msgs => {
      if (msgs.length > 0) {
        setMessages(msgs.map(m => ({ text: m.text, highlight: false })))
      }
    })
  }, [])

  if (!messages || messages.length === 0) {
    return null
  }

  const doubled = [...messages, ...messages, ...messages]

  return (
    <div className="relative overflow-hidden w-full py-6 md:py-10 my-4 md:my-8 shadow-2xl">
      {/* Edge-to-Edge Background with luxury gradient and 3D inner shadow */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(90deg, #1A050A 0%, #3A0B15 50%, #1A050A 100%)',
          boxShadow: 'inset 0 10px 20px -5px rgba(0,0,0,0.9), inset 0 -10px 20px -5px rgba(0,0,0,0.9)'
        }}
      />
      
      {/* Subtle Motif Pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-20 mix-blend-overlay"
        style={{
          backgroundImage: "url('/generated-home/sg-motif-repeat.svg')",
          backgroundSize: '180px',
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center'
        }}
      />
      
      {/* 3D Top/Bottom Golden Borders (Edge-to-Edge) */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#8A6327] via-[#F8E7A2] to-[#8A6327] shadow-[0_0_10px_rgba(212,175,55,0.6)]" />
      <div className="absolute top-[4px] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FCD34D] to-transparent opacity-30" />
      
      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#8A6327] via-[#F8E7A2] to-[#8A6327] shadow-[0_0_10px_rgba(212,175,55,0.6)]" />
      <div className="absolute bottom-[4px] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FCD34D] to-transparent opacity-30" />

      {/* Marquee Content */}
      <div className="relative z-10 flex gap-12 sm:gap-24 marquee-track whitespace-nowrap items-center h-14">
        {doubled.map((msg, i) => (
          <div key={i} className="flex items-center gap-12 sm:gap-24">
            <span
              className={`text-xl sm:text-2xl md:text-3xl tracking-[0.15em] uppercase font-playfair ${msg.highlight ? 'font-bold italic' : 'font-medium'}`}
              style={{
                background: msg.highlight 
                  ? 'linear-gradient(to right, #FFFDE4, #F8E7A2, #D4AF37, #FFFDE4)' 
                  : 'linear-gradient(to right, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.8)) drop-shadow(0px 0px 12px rgba(212,175,55,0.25))'
              }}
            >
              {msg.text}
            </span>
            
            {/* Intricate 3D Separator Motif */}
            <div className="flex items-center justify-center relative w-10 h-10">
              <span 
                className="absolute animate-spin-slow text-3xl"
                style={{
                  background: 'linear-gradient(to right, #BF953F, #FCF6BA, #B38728)',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))'
                }}
              >
                &#10022;
              </span>
              <span className="absolute text-[#FCF6BA] text-sm font-bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>&#10022;</span>
            </div>
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
      `}} />
    </div>
  )
}

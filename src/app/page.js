'use client'
import { useState, useEffect } from 'react'
import styles from './page.module.css'

const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12']
const MONTH_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

function fmt(n) { return Number(n || 0).toLocaleString() }

export default function Home() {
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`)
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [tab, setTab] = useState('home')
  const [search, setSearch] = useState('')
  const [filterAcc, setFilterAcc] = useState('')
  const [filterType, setFilterType] = useState('')
  const [budgets, setBudgets] = useState({})
  const [budgetMode, setBudgetMode] = useState(false)
  const [editTx, setEditTx] = useState(null)
  const [categories, setCategories] = useState([])

  useEffect(() => { fetchData() }, [month])

  async function fetchData() {
    const [s, t, c] = await Promise.all([
      fetch(`/api/summary?month=${month}`).then(r => r.json()),
      fetch(`/api/transactions?month=${month}`).then(r => r.json()),
      fetch(`/api/categories`).then(r => r.json()),
    ])
    setSummary(s)
    setTransactions(Array.isArray(t) ? t : [])
    setCategories(Array.isArray(c) ? c : [])
  }

  async function saveEdit() {
    await fetch('/api/transactions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editTx)
    })
    setEditTx(null)
    fetchData()
  }

  async function deleteTx(id) {
    if (!confirm('ลบรายการนี้?')) return
    await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  const filtered = transactions.filter(tx => {
    const matchSearch = !search || tx.note?.includes(search) || tx.category?.includes(search)
    const matchAcc = !filterAcc || tx.account === filterAcc
    const matchType = !filterType || tx.type === filterType
    return matchSearch && matchAcc && matchType
  })

  const monthLabel = () => {
    const [y, m] = month.split('-')
    return `${MONTH_TH[parseInt(m)-1]} ${parseInt(y)+543}`
  }

  if (!summary) return <div style={{padding:'2rem',color:'var(--t2)'}}>กำลังโหลด...</div>

  return (
    <div style={{fontFamily:'Inter,sans-serif',maxWidth:'430px',margin:'0 auto',minHeight:'100vh',background:'#F8F8FC'}}>

      {tab === 'home' && (
        <div>
          <div style={{background:'#6C63FF',padding:'24px 20px 28px',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',right:'-20px',top:'-20px',width:'120px',height:'120px',borderRadius:'50%',background:'rgba(255,255,255,0.08)'}}/>
            <p style={{color:'rgba(255,255,255,0.75)',fontSize:'12px',marginBottom:'4px'}}>{monthLabel()}</p>
            <p style={{color:'#fff',fontSize:'32px',fontWeight:'700',letterSpacing:'-1px'}}>฿{fmt(summary.ktb.income + summary.gsb.income - summary.total_expense + summary.total_income - summary.total_income)}</p>
            <p style={{color:'#fff',fontSize:'32px',fontWeight:'700',letterSpacing:'-1px',marginBottom:'4px'}}>฿{fmt(summary.net + summary.total_expense)}</p>
            <p style={{color:'rgba(255,255,255,0.6)',fontSize:'11px',marginBottom:'16px'}}>ยอดรวมสองบัญชี</p>
            <div style={{display:'flex',gap:'8px'}}>
              {[
                {label:'เงินเข้า', val:`+฿${fmt(summary.total_income)}`, color:'#9FE1CB'},
                {label:'เงินออก', val:`-฿${fmt(summary.total_expense)}`, color:'#F5C4B3'},
                {label:'สุทธิ', val:(summary.net>=0?'+':'')+`฿${fmt(summary.net)}`, color:'#fff'},
              ].map(c => (
                <div key={c.label} style={{flex:1,background:'rgba(255,255,255,0.15)',borderRadius:'10px',padding:'10px 8px',textAlign:'center'}}>
                  <p style={{color:'rgba(255,255,255,0.65)',fontSize:'10px',marginBottom:'3px'}}>{c.label}</p>
                  <p style={{color:c.color,fontSize:'13px',fontWeight:'700'}}>{c.val}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{padding:'16px'}}>
            <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
              <select value={month} onChange={e=>setMonth(e.target.value)} style={{flex:1,padding:'8px 12px',borderRadius:'8px',border:'0.5px solid #ddd',fontSize:'13px',background:'#fff'}}>
                {[2024,2025,2026].flatMap(y => MONTHS.map(m => {
                  const val = `${y}-${m}`
                  return <option key={val} value={val}>{MONTH_TH[parseInt(m)-1]} {y+543}</option>
                }))}
              </select>
            </div>

            {[
              {key:'ktb', label:'กรุงไทย', role:'ใช้จ่ายส่วนตัว', bg:'#F0F4FF', nameColor:'#3C3489'},
              {key:'gsb', label:'ออมสิน', role:'ธุรกิจ + ลงทุน', bg:'#F0FBF5', nameColor:'#085041'},
            ].map(acc => (
              <div key={acc.key} style={{background:acc.bg,border:'0.5px solid #e0e0e0',borderRadius:'14px',padding:'16px',marginBottom:'10px'}}>
                <p style={{fontSize:'12px',fontWeight:'700',color:acc.nameColor,letterSpacing:'0.03em',marginBottom:'2px'}}>{acc.label}</p>
                <p style={{fontSize:'11px',color:'#888',marginBottom:'10px'}}>{acc.role}</p>
                <p style={{fontSize:'26px',fontWeight:'700',color:'#1a1a2e',marginBottom:'10px'}}>
                  ฿{fmt(summary[acc.key].income - summary[acc.key].expense + summary[acc.key].expense)}
                </p>
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                  <span style={{fontSize:'11px',padding:'4px 10px',borderRadius:'20px',background:'#E1F5EE',color:'#085041',fontWeight:'500'}}>เข้า +฿{fmt(summary[acc.key].income)}</span>
                  <span style={{fontSize:'11px',padding:'4px 10px',borderRadius:'20px',background:'#FAECE7',color:'#712B13',fontWeight:'500'}}>ออก -฿{fmt(summary[acc.key].expense)}</span>
                  <span style={{fontSize:'11px',padding:'4px 10px',borderRadius:'20px',background:'#E6F1FB',color:'#0C447C',fontWeight:'500'}}>สุทธิ {summary[acc.key].net>=0?'+':''} ฿{fmt(summary[acc.key].net)}</span>
                </div>
              </div>
            ))}

            <p style={{fontSize:'11px',fontWeight:'700',color:'#999',letterSpacing:'0.06em',marginTop:'16px',marginBottom:'10px'}}>รายการล่าสุด</p>
            <div style={{background:'#fff',border:'0.5px solid #eee',borderRadius:'14px',padding:'12px 14px'}}>
              {transactions.slice(0,5).map(tx => (
                <div key={tx.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 0',borderBottom:'0.5px solid #f0f0f0'}}>
                  <div style={{width:'36px',height:'36px',borderRadius:'10px',background:tx.type==='income'?'#E1F5EE':'#FAECE7',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span style={{fontSize:'16px'}}>{tx.type==='income'?'↙':'↗'}</span>
                  </div>
                  <div style={{flex:1}}>
                    <p style={{fontSize:'13px',fontWeight:'500',color:'#1a1a2e',marginBottom:'2px'}}>{tx.note || tx.category}</p>
                    <p style={{fontSize:'11px',color:'#999'}}>{tx.category} · {tx.account==='ktb'?'กรุงไทย':'ออมสิน'} · {tx.date}</p>
                  </div>
                  <span style={{fontSize:'14px',fontWeight:'700',color:tx.type==='income'?'#0F9E75':'#D85A30'}}>
                    {tx.type==='income'?'+':'-'}฿{fmt(tx.amount)}
                  </span>
                  <button onClick={()=>setEditTx({...tx})} style={{background:'none',border:'none',cursor:'pointer',color:'#bbb',fontSize:'14px'}}>✏️</button>
                </div>
              ))}
              {transactions.length === 0 && <p style={{textAlign:'center',color:'#bbb',fontSize:'13px',padding:'16px 0'}}>ยังไม่มีรายการเดือนนี้</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'monthly' && (
        <div>
          <div style={{background:'#1D9E75',padding:'24px 20px 28px'}}>
            <p style={{color:'rgba(255,255,255,0.75)',fontSize:'12px',marginBottom:'4px'}}>สรุปรายเดือน</p>
            <p style={{color:'#fff',fontSize:'28px',fontWeight:'700'}}>{monthLabel()}</p>
            <div style={{display:'flex',gap:'8px',marginTop:'16px'}}>
              <div style={{flex:1,background:'rgba(255,255,255,0.15)',borderRadius:'10px',padding:'10px',textAlign:'center'}}>
                <p style={{color:'rgba(255,255,255,0.65)',fontSize:'10px',marginBottom:'3px'}}>เงินเข้า</p>
                <p style={{color:'#9FE1CB',fontSize:'14px',fontWeight:'700'}}>+฿{fmt(summary.total_income)}</p>
              </div>
              <div style={{flex:1,background:'rgba(255,255,255,0.15)',borderRadius:'10px',padding:'10px',textAlign:'center'}}>
                <p style={{color:'rgba(255,255,255,0.65)',fontSize:'10px',marginBottom:'3px'}}>เงินออก</p>
                <p style={{color:'#F5C4B3',fontSize:'14px',fontWeight:'700'}}>-฿{fmt(summary.total_expense)}</p>
              </div>
            </div>
          </div>

          <div style={{padding:'16px'}}>
            {['ktb','gsb'].map(acc => {
              const cats = summary[acc].by_category
              const max = Math.max(...Object.values(cats), 1)
              return (
                <div key={acc} style={{background:'#fff',border:'0.5px solid #eee',borderRadius:'14px',padding:'16px',marginBottom:'12px'}}>
                  <p style={{fontSize:'13px',fontWeight:'600',color:'#1a1a2e',marginBottom:'12px'}}>
                    breakdown — {acc==='ktb'?'กรุงไทย':'ออมสิน'}
                  </p>
                  {Object.entries(cats).length === 0 && <p style={{fontSize:'12px',color:'#bbb'}}>ยังไม่มีรายการ</p>}
                  {Object.entries(cats).map(([cat, amt]) => (
                    <div key={cat} style={{marginBottom:'10px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',marginBottom:'4px'}}>
                        <span style={{color:'#666'}}>{cat}</span>
                        <span style={{fontWeight:'600',color:'#1a1a2e'}}>฿{fmt(amt)}</span>
                      </div>
                      <div style={{height:'6px',background:'#f0f0f0',borderRadius:'3px',overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${(amt/max)*100}%`,background:acc==='ktb'?'#D85A30':'#6C63FF',borderRadius:'3px'}}/>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}

            <div style={{background:'#fff',border:'0.5px solid #eee',borderRadius:'14px',padding:'16px'}}>
              <p style={{fontSize:'13px',fontWeight:'600',marginBottom:'12px'}}>export ข้อมูล</p>
              <button onClick={()=>alert('ฟีเจอร์นี้จะพร้อมเร็วๆนี้')} style={{width:'100%',padding:'12px',background:'#F0F4FF',border:'0.5px solid #C0C8FF',borderRadius:'8px',cursor:'pointer',fontSize:'13px',fontWeight:'500',color:'#3C3489',marginBottom:'8px'}}>
                📄 ดาวน์โหลด PDF เดือนนี้
              </button>
              <button onClick={()=>{
                const csv = ['date,type,account,category,amount,note',...transactions.map(t=>`${t.date},${t.type},${t.account},${t.category},${t.amount},${t.note||''}`)].join('\n')
                const blob = new Blob([csv],{type:'text/csv'})
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
                a.download = `finance-${month}.csv`; a.click()
              }} style={{width:'100%',padding:'12px',background:'#F0FBF5',border:'0.5px solid #9FE1CB',borderRadius:'8px',cursor:'pointer',fontSize:'13px',fontWeight:'500',color:'#085041'}}>
                ⬇️ ดาวน์โหลด CSV รายการทั้งหมด
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'search' && (
        <div style={{padding:'20px 16px'}}>
          <p style={{fontSize:'22px',fontWeight:'700',marginBottom:'16px',color:'#1a1a2e'}}>ค้นหา</p>
          <div style={{display:'flex',alignItems:'center',gap:'8px',background:'#f5f5f5',borderRadius:'10px',padding:'10px 14px',marginBottom:'12px'}}>
            <span>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหาร้าน, หมวด..." style={{background:'none',border:'none',outline:'none',fontSize:'13px',flex:1}}/>
          </div>
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'16px'}}>
            {[
              {label:'ทั้งหมด',acc:'',type:''},
              {label:'กรุงไทย',acc:'ktb',type:''},
              {label:'ออมสิน',acc:'gsb',type:''},
              {label:'เงินเข้า',acc:'',type:'income'},
              {label:'เงินออก',acc:'',type:'expense'},
            ].map(f => (
              <button key={f.label} onClick={()=>{setFilterAcc(f.acc);setFilterType(f.type)}}
                style={{fontSize:'11px',padding:'5px 12px',borderRadius:'20px',border:'0.5px solid #ddd',background:filterAcc===f.acc&&filterType===f.type?'#EEEDFE':'#fff',color:filterAcc===f.acc&&filterType===f.type?'#3C3489':'#888',cursor:'pointer',fontWeight:'500'}}>
                {f.label}
              </button>
            ))}
          </div>
          <div style={{background:'#fff',border:'0.5px solid #eee',borderRadius:'14px',padding:'12px 14px'}}>
            <p style={{fontSize:'11px',fontWeight:'700',color:'#999',letterSpacing:'0.06em',marginBottom:'10px'}}>{filtered.length} รายการ</p>
            {filtered.map(tx => (
              <div key={tx.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 0',borderBottom:'0.5px solid #f0f0f0'}}>
                <div style={{width:'36px',height:'36px',borderRadius:'10px',background:tx.type==='income'?'#E1F5EE':'#FAECE7',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span>{tx.type==='income'?'↙':'↗'}</span>
                </div>
                <div style={{flex:1}}>
                  <p style={{fontSize:'13px',fontWeight:'500',color:'#1a1a2e',marginBottom:'2px'}}>{tx.note||tx.category}</p>
                  <p style={{fontSize:'11px',color:'#999'}}>{tx.category} · {tx.account==='ktb'?'กรุงไทย':'ออมสิน'} · {tx.date}</p>
                </div>
                <span style={{fontSize:'13px',fontWeight:'700',color:tx.type==='income'?'#0F9E75':'#D85A30'}}>
                  {tx.type==='income'?'+':'-'}฿{fmt(tx.amount)}
                </span>
                <button onClick={()=>deleteTx(tx.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#ffaaaa',fontSize:'14px'}}>🗑️</button>
              </div>
            ))}
            {filtered.length === 0 && <p style={{textAlign:'center',color:'#bbb',fontSize:'13px',padding:'16px 0'}}>ไม่พบรายการ</p>}
          </div>
        </div>
      )}

      {tab === 'budget' && (
        <div>
          <div style={{background:'#534AB7',padding:'24px 20px 28px'}}>
            <p style={{color:'rgba(255,255,255,0.75)',fontSize:'12px',marginBottom:'4px'}}>โหมด</p>
            <p style={{color:'#fff',fontSize:'28px',fontWeight:'700'}}>budget</p>
          </div>
          <div style={{padding:'16px'}}>
            <div style={{display:'flex',background:'#f0f0f0',borderRadius:'8px',padding:'3px',marginBottom:'16px'}}>
              <button onClick={()=>setBudgetMode(false)} style={{flex:1,padding:'8px',fontSize:'12px',fontWeight:'500',borderRadius:'6px',border:!budgetMode?'0.5px solid #ddd':'none',background:!budgetMode?'#fff':'none',cursor:'pointer',color:!budgetMode?'#1a1a2e':'#999'}}>track only</button>
              <button onClick={()=>setBudgetMode(true)} style={{flex:1,padding:'8px',fontSize:'12px',fontWeight:'500',borderRadius:'6px',border:budgetMode?'0.5px solid #ddd':'none',background:budgetMode?'#fff':'none',cursor:'pointer',color:budgetMode?'#1a1a2e':'#999'}}>budget mode</button>
            </div>

            {!budgetMode && (
              <div style={{background:'#fff',border:'0.5px solid #eee',borderRadius:'14px',padding:'24px 16px',textAlign:'center'}}>
                <p style={{fontSize:'32px',marginBottom:'8px'}}>👁️</p>
                <p style={{fontSize:'13px',color:'#999'}}>แค่แทร็ก ไม่มี limit<br/>ดูรายจ่ายได้ที่หน้าสรุปรายเดือน</p>
              </div>
            )}

            {budgetMode && (
              <>
                <p style={{fontSize:'11px',fontWeight:'700',color:'#999',letterSpacing:'0.06em',marginBottom:'10px'}}>limit รายบัญชี</p>
                <div style={{background:'#fff',border:'0.5px solid #eee',borderRadius:'14px',padding:'16px',marginBottom:'12px'}}>
                  {[
                    {key:'ktb',label:'กรุงไทย',spent:summary.ktb.expense,limit:10000,color:'#6C63FF'},
                    {key:'gsb',label:'ออมสิน',spent:summary.gsb.expense,limit:15000,color:'#1D9E75'},
                  ].map(b => {
                    const pct = Math.min(Math.round((b.spent/b.limit)*100),100)
                    const barColor = pct>=90?'#E24B4A':pct>=75?'#EF9F27':b.color
                    return (
                      <div key={b.key} style={{marginBottom:'14px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',marginBottom:'6px'}}>
                          <span style={{fontWeight:'600',color:'#1a1a2e'}}>{b.label}</span>
                          <span style={{color:'#999',fontSize:'11px'}}>฿{fmt(b.spent)} / ฿{fmt(b.limit)}</span>
                        </div>
                        <div style={{height:'8px',background:'#f0f0f0',borderRadius:'4px',overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${pct}%`,background:barColor,borderRadius:'4px'}}/>
                        </div>
                        <p style={{fontSize:'11px',marginTop:'4px',color:pct>=90?'#E24B4A':pct>=75?'#EF9F27':'#999'}}>
                          {pct>=90?`เกือบเต็ม! เหลือ ฿${fmt(b.limit-b.spent)}`:pct>=75?`ใกล้ limit (${pct}%)`:`เหลือ ฿${fmt(b.limit-b.spent)}`}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div style={{padding:'20px 16px'}}>
          <p style={{fontSize:'22px',fontWeight:'700',marginBottom:'20px',color:'#1a1a2e'}}>ตั้งค่า</p>
          <p style={{fontSize:'11px',fontWeight:'700',color:'#999',letterSpacing:'0.06em',marginBottom:'10px'}}>หมวดหมู่</p>
          <div style={{background:'#fff',border:'0.5px solid #eee',borderRadius:'14px',padding:'12px 16px',marginBottom:'12px'}}>
            {categories.map(c => (
              <div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'0.5px solid #f5f5f5'}}>
                <span style={{fontSize:'13px',color:'#1a1a2e'}}>{c.name}</span>
                <span style={{fontSize:'10px',padding:'3px 8px',borderRadius:'20px',background:c.account==='ktb'?'#FAECE7':c.account==='gsb'?'#E1F5EE':'#f0f0f0',color:c.account==='ktb'?'#712B13':c.account==='gsb'?'#085041':'#888',fontWeight:'600'}}>
                  {c.account==='ktb'?'กรุงไทย':c.account==='gsb'?'ออมสิน':'ทั้งคู่'}
                </span>
              </div>
            ))}
            <button onClick={async()=>{
              const name = prompt('ชื่อหมวดใหม่:')
              const acc = prompt('บัญชี (ktb/gsb/both):')
              if(name&&acc) {
                await fetch('/api/categories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,account:acc})})
                fetchData()
              }
            }} style={{width:'100%',marginTop:'10px',padding:'10px',background:'#EEEDFE',border:'0.5px dashed #AFA9EC',borderRadius:'8px',cursor:'pointer',fontSize:'13px',fontWeight:'500',color:'#3C3489'}}>
              + เพิ่มหมวดใหม่
            </button>
          </div>

          <p style={{fontSize:'11px',fontWeight:'700',color:'#999',letterSpacing:'0.06em',marginBottom:'10px'}}>LINE Bot</p>
          <div style={{background:'#fff',border:'0.5px solid #eee',borderRadius:'14px',padding:'16px'}}>
            <p style={{fontSize:'13px',color:'#1a1a2e',marginBottom:'4px'}}>Webhook URL สำหรับตั้งใน LINE</p>
            <p style={{fontSize:'12px',color:'#6C63FF',wordBreak:'break-all',background:'#EEEDFE',padding:'8px',borderRadius:'6px'}}>
              {typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/webhook
            </p>
            <p style={{fontSize:'11px',color:'#999',marginTop:'8px'}}>นำ URL นี้ไปวางใน LINE Developers → Webhook URL</p>
          </div>
        </div>
      )}

      {editTx && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'flex-end',zIndex:100}}>
          <div style={{background:'#fff',borderRadius:'16px 16px 0 0',padding:'20px',width:'100%'}}>
            <p style={{fontSize:'16px',fontWeight:'600',marginBottom:'16px'}}>แก้ไขรายการ</p>
            {[
              {label:'จำนวนเงิน', key:'amount', type:'number'},
              {label:'หมวด', key:'category', type:'text'},
              {label:'หมายเหตุ', key:'note', type:'text'},
              {label:'วันที่', key:'date', type:'date'},
            ].map(f => (
              <div key={f.key} style={{marginBottom:'10px'}}>
                <p style={{fontSize:'11px',color:'#999',marginBottom:'4px'}}>{f.label}</p>
                <input type={f.type} value={editTx[f.key]||''} onChange={e=>setEditTx({...editTx,[f.key]:e.target.value})}
                  style={{width:'100%',padding:'8px 12px',borderRadius:'8px',border:'0.5px solid #ddd',fontSize:'13px'}}/>
              </div>
            ))}
            <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
              <button onClick={()=>setEditTx(null)} style={{flex:1,padding:'12px',borderRadius:'8px',border:'0.5px solid #ddd',background:'#fff',cursor:'pointer',fontSize:'13px'}}>ยกเลิก</button>
              <button onClick={saveEdit} style={{flex:1,padding:'12px',borderRadius:'8px',border:'none',background:'#6C63FF',color:'#fff',cursor:'pointer',fontSize:'13px',fontWeight:'600'}}>บันทึก</button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:'flex',background:'#fff',borderTop:'0.5px solid #eee',position:'sticky',bottom:0,zIndex:50}}>
        {[
          {id:'home',icon:'🏠',label:'หน้าหลัก'},
          {id:'monthly',icon:'📊',label:'รายเดือน'},
          {id:'search',icon:'🔍',label:'ค้นหา'},
          {id:'budget',icon:'🎯',label:'budget'},
          {id:'settings',icon:'⚙️',label:'ตั้งค่า'},
        ].map(n => (
          <button key={n.id} onClick={()=>setTab(n.id)}
            style={{flex:1,padding:'10px 0 8px',fontSize:'10px',fontWeight:'500',color:tab===n.id?'#6C63FF':'#999',background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
            <span style={{fontSize:'18px'}}>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </div>
    </div>
  )
}

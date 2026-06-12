// src/components/ui/StatsRow.js

export default function StatsRow({ listings = 0, landlords = 0, matches = 0 }) {
  const items = [
    { num: listings.toLocaleString(), label: '上架房源' },
    { num: landlords.toLocaleString(), label: '認證房東' },
    { num: matches.toLocaleString(), label: '成功媒合' },
    { num: '4.8', label: '平均評分' },
  ]
  return (
    <div className="flex gap-8 mt-10 flex-wrap">
      {items.map(({ num, label }) => (
        <div key={label} className="text-center">
          <div className="text-[28px] font-black text-[var(--sage-dark)] leading-none font-[Montserrat,sans-serif]">{num}</div>
          <div className="text-[11px] text-[var(--gray-light)] tracking-widest mt-1">{label}</div>
        </div>
      ))}
    </div>
  )
}

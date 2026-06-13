import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

const MONTH_LABELS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
]
const MONTH_VALUES = ['01','02','03','04','05','06','07','08','09','10','11','12']
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 15 }, (_, i) => String(CURRENT_YEAR - 4 + i))

function daysInMonth(year: string, month: string): string[] {
  const y = parseInt(year) || new Date().getFullYear()
  const m = parseInt(month) || 1
  const count = new Date(y, m, 0).getDate()
  return Array.from({ length: count }, (_, i) => String(i + 1).padStart(2, '0'))
}

function clampDay(day: string, year: string, month: string): string {
  if (!day) return ''
  const maxDays = daysInMonth(year, month)
  return parseInt(day) > maxDays.length ? maxDays[maxDays.length - 1] : day
}

function parseDateStr(value: string | null | undefined) {
  if (!value || value.length < 10) return { year: '', month: '', day: '' }
  const [y = '', m = '', d = ''] = value.substring(0, 10).split('-')
  return { year: y, month: m, day: d }
}

function parseTimeStr(value: string | null | undefined) {
  if (!value || value.length < 16) return { hour: '', minute: '' }
  const [h = '', min = ''] = value.substring(11, 16).split(':')
  return { hour: h, minute: min }
}

// ─── DateSelect ───────────────────────────────────────────────────────────────

type DateSelectProps = {
  value?: string | null
  onChange: (value: string) => void
}

export function DateSelect({ value, onChange }: DateSelectProps) {
  const init = parseDateStr(value)
  const [year, setYear] = useState(init.year)
  const [month, setMonth] = useState(init.month)
  const [day, setDay] = useState(init.day)

  // Sync when the value prop changes from outside (e.g. opening a different record to edit)
  useEffect(() => {
    const { year: y, month: m, day: d } = parseDateStr(value)
    setYear(y); setMonth(m); setDay(d)
  }, [value])

  const emit = (y: string, m: string, d: string) => {
    onChange(y && m && d ? `${y}-${m}-${d}` : '')
  }

  const handleDay = (d: string) => { setDay(d); emit(year, month, d) }

  const handleMonth = (m: string) => {
    const d = clampDay(day, year, m)
    setMonth(m); setDay(d); emit(year, m, d)
  }

  const handleYear = (y: string) => {
    const d = clampDay(day, y, month)
    setYear(y); setDay(d); emit(y, month, d)
  }

  const handleClear = () => {
    setYear(''); setMonth(''); setDay(''); onChange('')
  }

  const days = daysInMonth(year, month)

  return (
    <div className="flex gap-2 items-center">
      <Select value={day} onValueChange={handleDay}>
        <SelectTrigger className="w-[76px]">
          <SelectValue placeholder="Ngày" />
        </SelectTrigger>
        <SelectContent className="max-h-52">
          {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={month} onValueChange={handleMonth}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Tháng" />
        </SelectTrigger>
        <SelectContent>
          {MONTH_VALUES.map((m, i) => (
            <SelectItem key={m} value={m}>{MONTH_LABELS[i]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={year} onValueChange={handleYear}>
        <SelectTrigger className="w-[88px]">
          <SelectValue placeholder="Năm" />
        </SelectTrigger>
        <SelectContent>
          {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
        </SelectContent>
      </Select>

      {(day || month || year) && (
        <Button
          type="button" variant="ghost" size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={handleClear} title="Xóa ngày"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}

// ─── DateTimeSelect ───────────────────────────────────────────────────────────

type DateTimeSelectProps = {
  value?: string | null
  onChange: (value: string) => void
}

export function DateTimeSelect({ value, onChange }: DateTimeSelectProps) {
  const initDate = parseDateStr(value)
  const initTime = parseTimeStr(value)
  const [year, setYear]     = useState(initDate.year)
  const [month, setMonth]   = useState(initDate.month)
  const [day, setDay]       = useState(initDate.day)
  const [hour, setHour]     = useState(initTime.hour)
  const [minute, setMinute] = useState(initTime.minute)

  useEffect(() => {
    const { year: y, month: m, day: d } = parseDateStr(value)
    const { hour: h, minute: min } = parseTimeStr(value)
    setYear(y); setMonth(m); setDay(d); setHour(h); setMinute(min)
  }, [value])

  const emit = (y: string, m: string, d: string, h: string, min: string) => {
    onChange(y && m && d && h && min ? `${y}-${m}-${d}T${h}:${min}` : '')
  }

  const handleDay = (d: string) => { setDay(d); emit(year, month, d, hour, minute) }

  const handleMonth = (m: string) => {
    const d = clampDay(day, year, m)
    setMonth(m); setDay(d); emit(year, m, d, hour, minute)
  }

  const handleYear = (y: string) => {
    const d = clampDay(day, y, month)
    setYear(y); setDay(d); emit(y, month, d, hour, minute)
  }

  const handleHour = (h: string) => { setHour(h); emit(year, month, day, h, minute) }
  const handleMinute = (min: string) => { setMinute(min); emit(year, month, day, hour, min) }

  const handleClear = () => {
    setYear(''); setMonth(''); setDay(''); setHour(''); setMinute(''); onChange('')
  }

  const days = daysInMonth(year, month)
  const hasAny = !!(day || month || year || hour || minute)

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <Select value={day} onValueChange={handleDay}>
          <SelectTrigger className="w-[76px]">
            <SelectValue placeholder="Ngày" />
          </SelectTrigger>
          <SelectContent className="max-h-52">
            {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={month} onValueChange={handleMonth}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Tháng" />
          </SelectTrigger>
          <SelectContent>
            {MONTH_VALUES.map((m, i) => (
              <SelectItem key={m} value={m}>{MONTH_LABELS[i]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={year} onValueChange={handleYear}>
          <SelectTrigger className="w-[88px]">
            <SelectValue placeholder="Năm" />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 items-center">
        <Select value={hour} onValueChange={handleHour}>
          <SelectTrigger className="w-[76px]">
            <SelectValue placeholder="Giờ" />
          </SelectTrigger>
          <SelectContent className="max-h-52">
            {HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
          </SelectContent>
        </Select>

        <span className="text-muted-foreground font-medium select-none">:</span>

        <Select value={minute} onValueChange={handleMinute}>
          <SelectTrigger className="w-[76px]">
            <SelectValue placeholder="Phút" />
          </SelectTrigger>
          <SelectContent className="max-h-52">
            {MINUTES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground">giờ Việt Nam (UTC+7)</span>

        {hasAny && (
          <Button
            type="button" variant="ghost" size="icon"
            className="h-8 w-8 shrink-0 ml-auto text-muted-foreground hover:text-destructive"
            onClick={handleClear} title="Xóa ngày giờ"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

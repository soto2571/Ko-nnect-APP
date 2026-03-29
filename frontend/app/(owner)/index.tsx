import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/services/api';
import type { Employee, Shift } from '@/types';
import { COLORS } from '@/constants';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_ABBR   = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MINUTES = [0, 15, 30, 45];

function getWeekDates(offset: number): Date[] {
  const today = new Date();
  const sun = new Date(today);
  sun.setDate(today.getDate() - today.getDay() + offset * 7);
  sun.setHours(0,0,0,0);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(sun); d.setDate(sun.getDate()+i); return d; });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function isToday(d: Date) { return isSameDay(d, new Date()); }
function isPastDay(d: Date) { const t = new Date(); t.setHours(0,0,0,0); return d < t; }

function fmt12(iso: string) {
  const d = new Date(iso);
  const h = d.getHours(), m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h%12===0?12:h%12}:${String(m).padStart(2,'0')} ${ap}`;
}

function to24(h: number, ap: 'AM'|'PM') {
  if (ap==='AM') return h===12 ? 0 : h;
  return h===12 ? 12 : h+12;
}

function fmtDisplay(h: number, m: number, ap: 'AM'|'PM') {
  return `${h}:${String(m).padStart(2,'0')} ${ap}`;
}

function weekLabel(dates: Date[]) {
  const s=dates[0], e=dates[6];
  return s.getMonth()===e.getMonth()
    ? `${MONTH_SHORT[s.getMonth()]} ${s.getDate()} – ${e.getDate()}`
    : `${MONTH_SHORT[s.getMonth()]} ${s.getDate()} – ${MONTH_SHORT[e.getMonth()]} ${e.getDate()}`;
}

// Group shifts by calendar day, return sorted array of { label, dateKey, shifts }
function groupByDay(shifts: Shift[]) {
  const map = new Map<string, Shift[]>();
  for (const s of shifts) {
    const d = new Date(s.startTime);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries())
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([key, dayShifts]) => {
      const d = new Date(dayShifts[0].startTime);
      return {
        key,
        label: d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }),
        shifts: dayShifts.sort((a,b) => new Date(a.startTime).getTime()-new Date(b.startTime).getTime()),
      };
    });
}

// ─── Time Picker (scroll hours, grid minutes) ────────────────────────────────

function TimePicker({ label, hour, minute, ampm, onHour, onMinute, onAmpm, color }: {
  label: string; hour: number; minute: number; ampm: 'AM'|'PM';
  onHour:(h:number)=>void; onMinute:(m:number)=>void; onAmpm:(a:'AM'|'PM')=>void; color: string;
}) {
  const hours = Array.from({length:12},(_,i)=>i+1);
  return (
    <View style={tp.wrap}>
      <Text style={tp.label}>{label}</Text>
      <View style={tp.row}>
        {/* Scrollable hours */}
        <ScrollView style={tp.scroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          {hours.map(h => (
            <TouchableOpacity key={h} style={[tp.item, hour===h && {backgroundColor:color, borderRadius:8}]} onPress={()=>onHour(h)}>
              <Text style={[tp.itemText, hour===h && {color:'#fff',fontWeight:'700'}]}>{h}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={tp.colon}>:</Text>
        {/* Minute column (4 buttons, no scroll needed) */}
        <View style={tp.minCol}>
          {MINUTES.map(m => (
            <TouchableOpacity key={m} style={[tp.minItem, minute===m && {backgroundColor:color, borderRadius:8}]} onPress={()=>onMinute(m)}>
              <Text style={[tp.itemText, minute===m && {color:'#fff',fontWeight:'700'}]}>{String(m).padStart(2,'0')}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* AM/PM */}
        <View style={tp.ampmCol}>
          {(['AM','PM'] as const).map(a => (
            <TouchableOpacity key={a} style={[tp.ampmBtn, ampm===a && {backgroundColor:color, borderRadius:8}]} onPress={()=>onAmpm(a)}>
              <Text style={[tp.ampmText, ampm===a && {color:'#fff',fontWeight:'700'}]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({ selected, onToggle, color }: {
  selected: Set<string>; onToggle:(k:string)=>void; color:string;
}) {
  const today = new Date();
  const [year,setYear] = useState(today.getFullYear());
  const [month,setMonth] = useState(today.getMonth());
  const dim = new Date(year,month+1,0).getDate();
  const first = new Date(year,month,1).getDay();
  const cells: (number|null)[] = [...Array(first).fill(null), ...Array.from({length:dim},(_,i)=>i+1)];
  const toKey = (d:number) => `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const prevM = () => month===0 ? (setMonth(11),setYear(y=>y-1)) : setMonth(m=>m-1);
  const nextM = () => month===11 ? (setMonth(0),setYear(y=>y+1)) : setMonth(m=>m+1);

  return (
    <View>
      <View style={cal.header}>
        <TouchableOpacity onPress={prevM} style={cal.navBtn}><Ionicons name="chevron-back" size={18} color={COLORS.text}/></TouchableOpacity>
        <Text style={cal.month}>{MONTH_LONG[month]} {year}</Text>
        <TouchableOpacity onPress={nextM} style={cal.navBtn}><Ionicons name="chevron-forward" size={18} color={COLORS.text}/></TouchableOpacity>
      </View>
      <View style={cal.dayRow}>{DAY_ABBR.map(d=><Text key={d} style={cal.dayName}>{d}</Text>)}</View>
      <View style={cal.grid}>
        {cells.map((day,i)=>{
          if(!day) return <View key={`e${i}`} style={cal.cell}/>;
          const k = toKey(day);
          const sel = selected.has(k);
          const past = new Date(year,month,day) < new Date(today.getFullYear(),today.getMonth(),today.getDate());
          return (
            <TouchableOpacity key={k}
              style={[cal.cell, sel && {backgroundColor:color,borderRadius:20}, past && {opacity:0.25}]}
              onPress={()=>!past && onToggle(k)} disabled={past}>
              <Text style={[cal.dayText, sel && {color:'#fff',fontWeight:'700'}]}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Weekly Dashboard ─────────────────────────────────────────────────────────

function WeeklyCalendar({ offset, onPrev, onNext, maxNext, shifts, employees, color }: {
  offset:number; onPrev:()=>void; onNext:()=>void; maxNext:boolean;
  shifts:Shift[]; employees:Employee[]; color:string;
}) {
  const dates = getWeekDates(offset);
  const empById = (id?:string) => id ? employees.find(e=>e.userId===id||e.employeeId===id) : undefined;
  const shiftsForDay = (d:Date) => shifts.filter(s=>isSameDay(new Date(s.startTime),d));

  return (
    <View style={wk.container}>
      <View style={wk.nav}>
        <TouchableOpacity onPress={onPrev} style={wk.navBtn}><Ionicons name="chevron-back" size={18} color={COLORS.text}/></TouchableOpacity>
        <Text style={wk.label}>{weekLabel(dates)}</Text>
        <TouchableOpacity onPress={onNext} style={wk.navBtn} disabled={maxNext}>
          <Ionicons name="chevron-forward" size={18} color={maxNext?COLORS.border:COLORS.text}/>
        </TouchableOpacity>
      </View>
      <View style={wk.grid}>
        {dates.map((date,i)=>{
          const dayShifts = shiftsForDay(date);
          const today = isToday(date);
          const past = isPastDay(date);
          return (
            <View key={i} style={wk.col}>
              <Text style={[wk.abbr, past&&{opacity:0.35}]}>{DAY_ABBR[i]}</Text>
              <View style={[wk.numWrap, today&&{backgroundColor:color}]}>
                <Text style={[wk.num, today&&{color:'#fff'}, past&&{opacity:0.35}]}>{date.getDate()}</Text>
              </View>
              <View style={wk.dots}>
                {dayShifts.slice(0,3).map(s=>{
                  const emp = empById(s.employeeId);
                  return (
                    <View key={s.shiftId} style={[wk.dot,{backgroundColor:past?COLORS.border:color}]}>
                      <Text style={wk.dotText}>{emp?`${emp.firstName[0]}${emp.lastName[0]}`:'?'}</Text>
                    </View>
                  );
                })}
                {dayShifts.length>3 && <Text style={[wk.more,{color}]}>+{dayShifts.length-3}</Text>}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type ModalMode = 'create' | 'edit';

export default function ShiftsScreen() {
  const { business, primaryColor } = useAuth();
  const [shifts, setShifts]     = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]   = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [modalVisible, setModalVisible] = useState(false);
  const [editShift, setEditShift] = useState<Shift|null>(null);
  const [step, setStep] = useState<'calendar'|'time'|'employee'>('calendar');

  // Form
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [startH,setStartH] = useState(9);  const [startM,setStartM] = useState(0);  const [startAp,setStartAp] = useState<'AM'|'PM'>('AM');
  const [endH,setEndH]     = useState(5);  const [endM,setEndM]     = useState(0);  const [endAp,setEndAp]     = useState<'AM'|'PM'>('PM');
  const [selEmp, setSelEmp] = useState<Employee|null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!business?.businessId) return;
    setLoading(true);
    try {
      const [s,e] = await Promise.all([api.getShifts(business.businessId), api.getEmployees(business.businessId)]);
      setShifts(s.sort((a,b)=>new Date(a.startTime).getTime()-new Date(b.startTime).getTime()));
      setEmployees(e);
    } catch(err:any) { Alert.alert('Error',err.message); }
    finally { setLoading(false); }
  }, [business?.businessId]);

  useFocusEffect(useCallback(()=>{ load(); },[load]));

  // Week filter
  const weekDates  = getWeekDates(weekOffset);
  const weekStart  = weekDates[0];
  const weekEnd    = new Date(weekDates[6]); weekEnd.setHours(23,59,59);
  const weekShifts = shifts.filter(s=>{ const d=new Date(s.startTime); return d>=weekStart && d<=weekEnd; });
  const grouped    = groupByDay(weekShifts);

  const empById = (id?:string) => id ? employees.find(e=>e.userId===id||e.employeeId===id) : undefined;

  // ── Open create ──
  const openCreate = () => {
    if (employees.length===0) { Alert.alert('No Employees','Add employees first.'); return; }
    setModalMode('create');
    setSelectedDates(new Set()); setStartH(9); setStartM(0); setStartAp('AM');
    setEndH(5); setEndM(0); setEndAp('PM'); setSelEmp(null); setStep('calendar');
    setModalVisible(true);
  };

  // ── Open edit ──
  const openEdit = (shift: Shift) => {
    const d = new Date(shift.startTime);
    const h = d.getHours(), m = d.getMinutes();
    const ap: 'AM'|'PM' = h>=12?'PM':'AM';
    const h12 = h%12===0?12:h%12;
    const ed = new Date(shift.endTime);
    const eh = ed.getHours(), em = ed.getMinutes();
    const eap: 'AM'|'PM' = eh>=12?'PM':'AM';
    const eh12 = eh%12===0?12:eh%12;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    setModalMode('edit'); setEditShift(shift);
    setSelectedDates(new Set([dateStr]));
    setStartH(h12); setStartM(m); setStartAp(ap);
    setEndH(eh12); setEndM(em); setEndAp(eap);
    setSelEmp(empById(shift.employeeId) ?? null);
    setStep('time');
    setModalVisible(true);
  };

  // ── Create ──
  const handleCreate = async () => {
    if (!selEmp) return;
    const s24=to24(startH,startAp), e24=to24(endH,endAp);
    setSaving(true);
    try {
      await Promise.all(Array.from(selectedDates).map(dateStr=>
        api.createShift({
          businessId: business!.businessId,
          title: `${selEmp.firstName}'s Shift`,
          startTime: new Date(`${dateStr}T${String(s24).padStart(2,'0')}:${String(startM).padStart(2,'0')}:00`).toISOString(),
          endTime:   new Date(`${dateStr}T${String(e24).padStart(2,'0')}:${String(endM).padStart(2,'0')}:00`).toISOString(),
        }).then(shift=>api.assignShift(shift.shiftId,{ employeeId: selEmp.userId||selEmp.employeeId, status:'assigned' }))
      ));
      setModalVisible(false);
      await load();
    } catch(err:any) { Alert.alert('Error',err.message); }
    finally { setSaving(false); }
  };

  // ── Save edit ──
  const handleSaveEdit = async () => {
    if (!editShift || !selEmp) return;
    setSaving(true);
    try {
      await api.assignShift(editShift.shiftId, { employeeId: selEmp.userId||selEmp.employeeId, status:'assigned' });
      setModalVisible(false);
      await load();
    } catch(err:any) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (shiftId:string) => {
    Alert.alert('Delete Shift','Are you sure?',[
      {text:'Cancel',style:'cancel'},
      {text:'Delete',style:'destructive',onPress:async()=>{ await api.deleteShift(shiftId); load(); }},
    ]);
  };

  if (!business) return <View style={s.centered}><Text style={s.emptyText}>Set up your business in Settings first.</Text></View>;

  // Flat data for FlatList: alternating day headers + shifts
  type ListItem = { type:'header'; label:string; key:string } | { type:'shift'; shift:Shift; key:string };
  const listItems: ListItem[] = [];
  for (const group of grouped) {
    listItems.push({ type:'header', label:group.label, key:`h-${group.key}` });
    for (const shift of group.shifts) {
      listItems.push({ type:'shift', shift, key:shift.shiftId });
    }
  }

  return (
    <View style={s.container}>
      {loading ? <ActivityIndicator style={{flex:1}} color={primaryColor}/> : (
        <FlatList
          data={listItems}
          keyExtractor={item=>item.key}
          contentContainerStyle={{paddingBottom:100}}
          ListHeaderComponent={
            <View>
              <WeeklyCalendar offset={weekOffset}
                onPrev={()=>setWeekOffset(o=>o-1)} onNext={()=>setWeekOffset(o=>o+1)}
                maxNext={weekOffset>=3} shifts={shifts} employees={employees} color={primaryColor}/>
              <View style={s.listHeader}>
                <Text style={s.listHeaderText}>
                  {weekShifts.length} shift{weekShifts.length!==1?'s':''} this week
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={s.emptyWeek}>
              <Ionicons name="calendar-outline" size={36} color={COLORS.border}/>
              <Text style={s.emptyText}>No shifts this week</Text>
            </View>
          }
          renderItem={({item})=>{
            if (item.type==='header') {
              return (
                <View style={s.dayHeader}>
                  <View style={[s.dayHeaderDot,{backgroundColor:primaryColor}]}/>
                  <Text style={s.dayHeaderText}>{item.label}</Text>
                </View>
              );
            }
            const shift = item.shift;
            const emp = empById(shift.employeeId);
            return (
              <View style={s.card}>
                <View style={[s.colorBar,{backgroundColor:primaryColor}]}/>
                <View style={{flex:1,paddingLeft:12}}>
                  <Text style={s.cardTitle}>{shift.title}</Text>
                  <Text style={s.cardTime}>{fmt12(shift.startTime)} – {fmt12(shift.endTime)}</Text>
                  {emp && (
                    <View style={[s.empBadge,{backgroundColor:primaryColor+'18'}]}>
                      <View style={[s.empBadgeAvatar,{backgroundColor:primaryColor}]}>
                        <Text style={s.empBadgeInitials}>{emp.firstName[0]}{emp.lastName[0]}</Text>
                      </View>
                      <Text style={[s.empBadgeName,{color:primaryColor}]}>{emp.firstName} {emp.lastName}</Text>
                    </View>
                  )}
                </View>
                <View style={s.cardActions}>
                  <TouchableOpacity onPress={()=>openEdit(shift)} style={s.iconBtn}>
                    <Ionicons name="pencil-outline" size={17} color={primaryColor}/>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={()=>handleDelete(shift.shiftId)} style={s.iconBtn}>
                    <Ionicons name="trash-outline" size={17} color={COLORS.danger}/>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      <TouchableOpacity style={[s.fab,{backgroundColor:primaryColor}]} onPress={openCreate}>
        <Ionicons name="add" size={28} color="#fff"/>
      </TouchableOpacity>

      {/* ── Shift Modal (create & edit) ── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <TouchableOpacity onPress={()=>setModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary}/>
              </TouchableOpacity>
              <Text style={s.sheetTitle}>{modalMode==='edit'?'Edit Shift':'New Shift'}</Text>
              <View style={{width:22}}/>
            </View>

            {/* Step indicators — only for create mode */}
            {modalMode==='create' && (
              <View style={s.stepRow}>
                {(['calendar','time','employee'] as const).map((st,i)=>{
                  const done=(step==='time'&&i===0)||(step==='employee'&&i<=1);
                  const active=step===st;
                  return (
                    <View key={st} style={{flexDirection:'row',alignItems:'center'}}>
                      <View style={[s.stepDot,(active||done)&&{backgroundColor:primaryColor}]}>
                        {done?<Ionicons name="checkmark" size={12} color="#fff"/>:<Text style={s.stepDotText}>{i+1}</Text>}
                      </View>
                      {i<2 && <View style={[s.stepLine,done&&{backgroundColor:primaryColor}]}/>}
                    </View>
                  );
                })}
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} style={{maxHeight:500}}>
              {/* Calendar step */}
              {step==='calendar' && modalMode==='create' && (
                <View style={{gap:6}}>
                  <Text style={s.stepTitle}>Select date(s)</Text>
                  <Text style={s.stepSub}>Tap multiple days to batch-create shifts</Text>
                  <MiniCalendar selected={selectedDates}
                    onToggle={k=>setSelectedDates(prev=>{const n=new Set(prev);n.has(k)?n.delete(k):n.add(k);return n;})}
                    color={primaryColor}/>
                  {selectedDates.size>0 &&
                    <Text style={[s.selCount,{color:primaryColor}]}>{selectedDates.size} day{selectedDates.size>1?'s':''} selected</Text>}
                </View>
              )}

              {/* Time step */}
              {step==='time' && (
                <View style={{gap:16}}>
                  <Text style={s.stepTitle}>Set shift hours</Text>
                  <TimePicker label="Start time" hour={startH} minute={startM} ampm={startAp}
                    onHour={setStartH} onMinute={setStartM} onAmpm={setStartAp} color={primaryColor}/>
                  <TimePicker label="End time" hour={endH} minute={endM} ampm={endAp}
                    onHour={setEndH} onMinute={setEndM} onAmpm={setEndAp} color={primaryColor}/>
                  <View style={[s.timeSummary,{borderColor:primaryColor+'40',backgroundColor:primaryColor+'10'}]}>
                    <Ionicons name="time-outline" size={15} color={primaryColor}/>
                    <Text style={[s.timeSummaryText,{color:primaryColor}]}>
                      {fmtDisplay(startH,startM,startAp)} – {fmtDisplay(endH,endM,endAp)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Employee step */}
              {step==='employee' && (
                <View style={{gap:8}}>
                  <Text style={s.stepTitle}>Assign to employee</Text>
                  {employees.map(emp=>(
                    <TouchableOpacity key={emp.employeeId}
                      style={[s.empRow,selEmp?.employeeId===emp.employeeId&&{borderColor:primaryColor,backgroundColor:primaryColor+'08'}]}
                      onPress={()=>setSelEmp(emp)}>
                      <View style={[s.avatar,{backgroundColor:selEmp?.employeeId===emp.employeeId?primaryColor:COLORS.border}]}>
                        <Text style={s.avatarText}>{emp.firstName[0]}{emp.lastName[0]}</Text>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={s.empName}>{emp.firstName} {emp.lastName}</Text>
                        <Text style={s.empEmail}>{emp.email}</Text>
                      </View>
                      {selEmp?.employeeId===emp.employeeId && <Ionicons name="checkmark-circle" size={22} color={primaryColor}/>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Edit mode: show time + employee on same scroll view */}
              {modalMode==='edit' && step==='time' && (
                <View style={{gap:16,marginTop:16}}>
                  <Text style={s.stepTitle}>Change employee</Text>
                  {employees.map(emp=>(
                    <TouchableOpacity key={emp.employeeId}
                      style={[s.empRow,selEmp?.employeeId===emp.employeeId&&{borderColor:primaryColor,backgroundColor:primaryColor+'08'}]}
                      onPress={()=>setSelEmp(emp)}>
                      <View style={[s.avatar,{backgroundColor:selEmp?.employeeId===emp.employeeId?primaryColor:COLORS.border}]}>
                        <Text style={s.avatarText}>{emp.firstName[0]}{emp.lastName[0]}</Text>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={s.empName}>{emp.firstName} {emp.lastName}</Text>
                      </View>
                      {selEmp?.employeeId===emp.employeeId && <Ionicons name="checkmark-circle" size={22} color={primaryColor}/>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={s.footer}>
              {modalMode==='create' && step!=='calendar' && (
                <TouchableOpacity style={s.backBtn} onPress={()=>setStep(step==='employee'?'time':'calendar')}>
                  <Text style={{color:COLORS.textSecondary,fontWeight:'600'}}>Back</Text>
                </TouchableOpacity>
              )}
              {modalMode==='edit' ? (
                <TouchableOpacity style={[s.nextBtn,{backgroundColor:primaryColor},(!selEmp||saving)&&{opacity:0.4}]}
                  onPress={handleSaveEdit} disabled={!selEmp||saving}>
                  {saving?<ActivityIndicator color="#fff"/>:<><Ionicons name="checkmark" size={15} color="#fff"/><Text style={{color:'#fff',fontWeight:'700'}}>Save Changes</Text></>}
                </TouchableOpacity>
              ) : step!=='employee' ? (
                <TouchableOpacity
                  style={[s.nextBtn,{backgroundColor:primaryColor},selectedDates.size===0&&step==='calendar'&&{opacity:0.4}]}
                  onPress={()=>setStep(step==='calendar'?'time':'employee')}
                  disabled={selectedDates.size===0&&step==='calendar'}>
                  <Text style={{color:'#fff',fontWeight:'700'}}>Next</Text><Ionicons name="arrow-forward" size={15} color="#fff"/>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[s.nextBtn,{backgroundColor:primaryColor},(!selEmp||saving)&&{opacity:0.4}]}
                  onPress={handleCreate} disabled={!selEmp||saving}>
                  {saving?<ActivityIndicator color="#fff"/>:<><Ionicons name="checkmark" size={15} color="#fff"/><Text style={{color:'#fff',fontWeight:'700'}}>Create {selectedDates.size>1?`${selectedDates.size} Shifts`:'Shift'}</Text></>}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:COLORS.background},
  centered:{flex:1,alignItems:'center',justifyContent:'center',paddingTop:60},
  emptyText:{color:COLORS.textSecondary,fontSize:15,marginTop:8,textAlign:'center'},
  emptyWeek:{alignItems:'center',paddingTop:30,gap:8},
  listHeader:{paddingHorizontal:16,paddingTop:14,paddingBottom:6},
  listHeaderText:{fontSize:12,fontWeight:'700',color:COLORS.textSecondary,textTransform:'uppercase',letterSpacing:0.6},
  dayHeader:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:16,paddingTop:14,paddingBottom:6},
  dayHeaderDot:{width:8,height:8,borderRadius:4},
  dayHeaderText:{fontSize:13,fontWeight:'700',color:COLORS.text},
  card:{
    backgroundColor:COLORS.white,flexDirection:'row',alignItems:'center',
    marginHorizontal:16,marginBottom:8,borderRadius:14,overflow:'hidden',
    paddingVertical:14,paddingRight:8,
    shadowColor:'#000',shadowOpacity:0.04,shadowRadius:6,shadowOffset:{width:0,height:2},elevation:2,
  },
  colorBar:{width:4,height:'100%'},
  cardTitle:{fontSize:15,fontWeight:'700',color:COLORS.text},
  cardTime:{fontSize:13,color:COLORS.textSecondary,marginTop:1},
  empBadge:{flexDirection:'row',alignItems:'center',gap:5,alignSelf:'flex-start',borderRadius:20,paddingRight:8,paddingVertical:2,marginTop:5},
  empBadgeAvatar:{width:18,height:18,borderRadius:9,alignItems:'center',justifyContent:'center'},
  empBadgeInitials:{color:'#fff',fontSize:9,fontWeight:'800'},
  empBadgeName:{fontSize:12,fontWeight:'600'},
  cardActions:{flexDirection:'column',gap:4,paddingRight:4},
  iconBtn:{padding:7},
  fab:{
    position:'absolute',bottom:28,right:24,width:56,height:56,
    borderRadius:28,alignItems:'center',justifyContent:'center',
    shadowColor:'#000',shadowOpacity:0.2,shadowRadius:8,shadowOffset:{width:0,height:4},elevation:6,
  },
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.45)',justifyContent:'flex-end'},
  sheet:{backgroundColor:COLORS.white,borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,paddingBottom:36,maxHeight:'93%'},
  sheetHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:16},
  sheetTitle:{fontSize:17,fontWeight:'700',color:COLORS.text},
  stepRow:{flexDirection:'row',alignItems:'center',justifyContent:'center',marginBottom:16},
  stepDot:{width:26,height:26,borderRadius:13,backgroundColor:COLORS.border,alignItems:'center',justifyContent:'center'},
  stepDotText:{color:'#fff',fontSize:12,fontWeight:'700'},
  stepLine:{width:36,height:2,backgroundColor:COLORS.border,marginHorizontal:4},
  stepTitle:{fontSize:16,fontWeight:'700',color:COLORS.text,marginBottom:2},
  stepSub:{fontSize:13,color:COLORS.textSecondary,marginBottom:8},
  selCount:{textAlign:'center',fontWeight:'600',fontSize:13,marginTop:4},
  timeSummary:{flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderRadius:10,padding:11},
  timeSummaryText:{fontWeight:'600',fontSize:14},
  empRow:{flexDirection:'row',alignItems:'center',gap:12,padding:12,borderRadius:12,borderWidth:1.5,borderColor:COLORS.border},
  avatar:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},
  avatarText:{color:'#fff',fontWeight:'700',fontSize:14},
  empName:{fontSize:15,fontWeight:'600',color:COLORS.text},
  empEmail:{fontSize:12,color:COLORS.textSecondary},
  footer:{flexDirection:'row',gap:10,marginTop:16},
  backBtn:{paddingVertical:13,paddingHorizontal:20,borderRadius:12,borderWidth:1,borderColor:COLORS.border,alignItems:'center',justifyContent:'center'},
  nextBtn:{flex:1,flexDirection:'row',gap:6,borderRadius:12,paddingVertical:13,alignItems:'center',justifyContent:'center'},
});

const wk = StyleSheet.create({
  container:{backgroundColor:COLORS.white,paddingHorizontal:12,paddingTop:16,paddingBottom:12,shadowColor:'#000',shadowOpacity:0.04,shadowRadius:6,shadowOffset:{width:0,height:2},elevation:2},
  nav:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:14,paddingHorizontal:4},
  navBtn:{padding:6},
  label:{fontSize:15,fontWeight:'700',color:COLORS.text},
  grid:{flexDirection:'row'},
  col:{flex:1,alignItems:'center',gap:4},
  abbr:{fontSize:11,fontWeight:'600',color:COLORS.textSecondary},
  numWrap:{width:28,height:28,borderRadius:14,alignItems:'center',justifyContent:'center'},
  num:{fontSize:13,fontWeight:'600',color:COLORS.text},
  dots:{gap:2,alignItems:'center',minHeight:60},
  dot:{width:26,height:26,borderRadius:13,alignItems:'center',justifyContent:'center'},
  dotText:{color:'#fff',fontSize:9,fontWeight:'800'},
  more:{fontSize:10,fontWeight:'700'},
});

const cal = StyleSheet.create({
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:10},
  navBtn:{padding:6},
  month:{fontSize:15,fontWeight:'700',color:COLORS.text},
  dayRow:{flexDirection:'row',marginBottom:4},
  dayName:{flex:1,textAlign:'center',fontSize:12,fontWeight:'600',color:COLORS.textSecondary},
  grid:{flexDirection:'row',flexWrap:'wrap'},
  cell:{width:`${100/7}%`,aspectRatio:1,alignItems:'center',justifyContent:'center'},
  dayText:{fontSize:14,color:COLORS.text},
});

const tp = StyleSheet.create({
  wrap:{gap:8},
  label:{fontSize:13,fontWeight:'600',color:COLORS.textSecondary},
  row:{flexDirection:'row',alignItems:'center',gap:6,height:130},
  scroll:{flex:1,backgroundColor:COLORS.background,borderRadius:10},
  item:{paddingVertical:9,alignItems:'center'},
  itemText:{fontSize:16,color:COLORS.text},
  colon:{fontSize:20,fontWeight:'700',color:COLORS.text},
  minCol:{justifyContent:'space-around',height:130,backgroundColor:COLORS.background,borderRadius:10,paddingVertical:4},
  minItem:{paddingVertical:8,paddingHorizontal:12,alignItems:'center'},
  ampmCol:{justifyContent:'space-around',height:130},
  ampmBtn:{paddingVertical:12,paddingHorizontal:10,alignItems:'center'},
  ampmText:{fontSize:14,fontWeight:'600',color:COLORS.textSecondary},
});

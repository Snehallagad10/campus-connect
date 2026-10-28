import { useEffect, useState } from "react";
import { format12HourTime, parse24HourTime } from "../utils/istTime";
import "./TimePicker.css";

const EMPTY_TIME = { hour: "", minute: "", period: "AM" };
const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

function TimePicker({ idPrefix, label, value, onChange, required = false }) {
  const [selected, setSelected] = useState(() => parse24HourTime(value) || EMPTY_TIME);

  useEffect(() => {
    setSelected(parse24HourTime(value) || EMPTY_TIME);
  }, [value]);

  const updatePart = (part, nextValue) => {
    const next = { ...selected, [part]: nextValue };
    setSelected(next);
    const converted = format12HourTime(next);
    if (converted) onChange(converted);
  };

  return (
    <div className="time-picker" role="group" aria-label={label}>
      <select
        id={`${idPrefix}-hour`}
        value={selected.hour}
        onChange={(event) => updatePart("hour", event.target.value)}
        aria-label={`${label} hour`}
        required={required}
      >
        <option value="">Hour</option>
        {HOURS.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
      </select>
      <span className="time-picker__separator" aria-hidden="true">:</span>
      <select
        id={`${idPrefix}-minute`}
        value={selected.minute}
        onChange={(event) => updatePart("minute", event.target.value)}
        aria-label={`${label} minute`}
        required={required}
      >
        <option value="">Min</option>
        {MINUTES.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
      </select>
      <select
        id={`${idPrefix}-period`}
        value={selected.period}
        onChange={(event) => updatePart("period", event.target.value)}
        aria-label={`${label} AM or PM`}
        required={required}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

export default TimePicker;

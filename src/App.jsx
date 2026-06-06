import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  Music,
  RotateCcw,
  Sparkles,
  VolumeX,
} from "lucide-react";

const STORAGE_KEY = "date-planner-valentine-v2";
const TOTAL_STEPS = 6;

const timeOptions = [
  { id: "8am", time: "8:00 AM", hour: 8, description: "Breakfast with the retirees ☕👴" },
  { id: "9am", time: "9:00 AM", hour: 9, description: "Coffee and bad decisions ☕😉" },
  { id: "11am", time: "11:00 AM", hour: 11, description: "Brunch like civilized people 🥞" },
  { id: "1pm", time: "1:00 PM", hour: 13, description: "Midday mischief 😏" },
  { id: "3pm", time: "3:00 PM", hour: 15, description: "Afternoon adventure 🌸" },
  { id: "5pm", time: "5:00 PM", hour: 17, description: "Dinner time 😍" },
  { id: "7pm", time: "7:00 PM", hour: 19, description: "Prime date hours 💕" },
  { id: "8pm", time: "8:00 PM", hour: 20, description: "Romance loading... ❤️" },
  { id: "9pm", time: "9:00 PM", hour: 21, description: "Late night fun 😉" },
  { id: "10pm", time: "10:00 PM", hour: 22, description: "Questionable decisions 😘" },
  { id: "11pm", time: "11:00 PM", hour: 23, description: "Stars, cuddles, maybe crime 🌙✨" },
];

const foodOptions = [
  { id: "pizza", label: "Pizza", emoji: "🍕" },
  { id: "burgers", label: "Burgers", emoji: "🍔" },
  { id: "steak", label: "Steak", emoji: "🥩" },
  { id: "italian", label: "Italian", emoji: "🍝" },
  { id: "mexican", label: "Mexican", emoji: "🌮" },
  { id: "sushi", label: "Sushi", emoji: "🍣" },
  { id: "breakfast", label: "Breakfast", emoji: "🥞" },
  { id: "surprise-food", label: "Surprise Me", emoji: "🎲" },
];

const activityOptions = [
  { id: "bowling", label: "Bowling", emoji: "🎳" },
  { id: "movie", label: "Movie", emoji: "🎥" },
  { id: "walk", label: "Walk", emoji: "🚶" },
  { id: "arcade", label: "Arcade", emoji: "🎮" },
  { id: "fishing", label: "Fishing", emoji: "🎣" },
  { id: "stargazing", label: "Stargazing", emoji: "🌌" },
  { id: "cuddling", label: "Cuddling", emoji: "🛋️" },
  { id: "surprise-activity", label: "Surprise Me", emoji: "🎲" },
];

const defaultState = {
  step: 0,
  inviterName: "Someone Who Likes You A Lot",
  guestName: "My Favorite Person",
  date: "2026-06-20",
  time: "9pm",
  food: "italian",
  activity: "stargazing",
  excitement: 97,
};

const defaultRunawayPosition = {
  active: false,
  x: 0,
  y: 0,
  rotation: 0,
  moves: 0,
};

function getInitialState() {
  if (typeof window === "undefined") {
    return defaultState;
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultState;
    return { ...defaultState, ...JSON.parse(saved) };
  } catch {
    return defaultState;
  }
}

function dateFromInput(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value, options = {}) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(dateFromInput(value));
}

function targetDateTime(dateValue, timeId) {
  const target = dateFromInput(dateValue);
  const selected = timeOptions.find((option) => option.id === timeId) ?? timeOptions[7];
  target.setHours(selected.hour, 0, 0, 0);
  return target;
}

function findOption(options, id) {
  return options.find((option) => option.id === id) ?? options[0];
}

function getExcitementLabel(value) {
  if (value >= 95) return "already picking outfits 💕";
  if (value >= 75) return "getting excited ❤️";
  if (value >= 51) return "okay okay 😏";
  if (value >= 23) return "mildly interested";
  return "playing hard to get";
}

function getCountdown(dateValue, timeId, now = new Date()) {
  const target = targetDateTime(dateValue, timeId);
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, arrived: true };
  }

  const minutesTotal = Math.floor(diff / 60000);
  const days = Math.floor(minutesTotal / 1440);
  const hours = Math.floor((minutesTotal % 1440) / 60);
  const minutes = minutesTotal % 60;
  return { days, hours, minutes, arrived: false };
}

function hashString(value) {
  return value.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);
}

function getCompatibilityScore(plan) {
  const food = findOption(foodOptions, plan.food);
  const activity = findOption(activityOptions, plan.activity);
  const names = `${plan.guestName}${plan.inviterName}${food.label}${activity.label}`;
  const sweetChaos = hashString(names) % 13;
  return Math.min(100, Math.max(70, Math.round(76 + plan.excitement * 0.14 + sweetChaos)));
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let nextY = y;

  words.forEach((word, index) => {
    const test = line ? `${line} ${word}` : word;
    const isLast = index === words.length - 1;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, nextY);
      line = word;
      nextY += lineHeight;
    } else {
      line = test;
    }

    if (isLast) {
      ctx.fillText(line, x, nextY);
    }
  });

  return nextY + lineHeight;
}

async function downloadDateCard(plan) {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const selectedTime = findOption(timeOptions, plan.time);
  const selectedFood = findOption(foodOptions, plan.food);
  const selectedActivity = findOption(activityOptions, plan.activity);
  const compatibility = getCompatibilityScore(plan);
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 1200, 1600);
  gradient.addColorStop(0, "#ffeaf4");
  gradient.addColorStop(0.45, "#ff9fc9");
  gradient.addColorStop(1, "#ff5d93");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 1600);

  for (let i = 0; i < 90; i += 1) {
    const x = (i * 137) % 1200;
    const y = (i * 223) % 1600;
    const size = 12 + ((i * 19) % 34);
    ctx.globalAlpha = 0.12 + ((i % 4) * 0.05);
    ctx.fillStyle = i % 3 === 0 ? "#ffffff" : "#b41554";
    ctx.font = `${size}px serif`;
    ctx.fillText(i % 2 === 0 ? "♥" : "✦", x, y);
  }

  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(600, 810);
  ctx.rotate(-0.025);
  ctx.fillStyle = "rgba(120, 25, 68, 0.16)";
  drawRoundedRect(ctx, -445, -610, 890, 1220, 34);
  ctx.fill();
  ctx.fillStyle = "#fff9fb";
  drawRoundedRect(ctx, -460, -630, 920, 1260, 34);
  ctx.fill();
  ctx.strokeStyle = "#f1498b";
  ctx.lineWidth = 10;
  drawRoundedRect(ctx, -410, -560, 820, 960, 26);
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = "#9b1044";
  ctx.font = "700 66px 'Dancing Script', 'Brush Script MT', cursive";
  ctx.fillText("Official Date Invitation", 600, 245);

  ctx.font = "700 44px Quicksand, Arial, sans-serif";
  ctx.fillText("💕 Date Reserved 💕", 600, 325);

  ctx.strokeStyle = "#ffb7d0";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(270, 368);
  ctx.lineTo(930, 368);
  ctx.stroke();

  const rows = [
    ["For", `${plan.guestName || defaultState.guestName} ❤️`],
    ["Date", formatDate(plan.date, { weekday: undefined })],
    ["Time", `${selectedTime.time}\n${selectedTime.description}`],
    ["Food", `${selectedFood.emoji} ${selectedFood.label}`],
    ["Activity", `${selectedActivity.emoji} ${selectedActivity.label}`],
    ["Excitement", `${plan.excitement}% - ${getExcitementLabel(plan.excitement)}`],
  ];

  let y = 450;
  rows.forEach(([label, value]) => {
    ctx.fillStyle = "#d82e73";
    ctx.font = "700 25px Quicksand, Arial, sans-serif";
    ctx.fillText(label, 600, y);
    ctx.fillStyle = "#5a1936";
    ctx.font = "600 36px Quicksand, Arial, sans-serif";
    value.split("\n").forEach((line, lineIndex) => {
      ctx.fillText(line, 600, y + 44 + lineIndex * 42);
    });
    y += value.includes("\n") ? 138 : 104;
  });

  ctx.strokeStyle = "#ffb7d0";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(270, y - 18);
  ctx.lineTo(930, y - 18);
  ctx.stroke();

  ctx.fillStyle = "#d82e73";
  ctx.font = "700 24px Quicksand, Arial, sans-serif";
  ctx.fillText("Dress Code", 600, y + 38);
  ctx.fillStyle = "#5a1936";
  ctx.font = "700 36px Quicksand, Arial, sans-serif";
  ctx.fillText("Absolutely Adorable ❤️", 600, y + 82);

  ctx.fillStyle = "#d82e73";
  ctx.font = "700 24px Quicksand, Arial, sans-serif";
  ctx.fillText("Reserved By", 600, y + 142);
  ctx.fillStyle = "#5a1936";
  ctx.font = "600 34px Quicksand, Arial, sans-serif";
  wrapText(ctx, plan.inviterName || defaultState.inviterName, 600, y + 184, 620, 42);

  ctx.save();
  ctx.translate(900, 305);
  ctx.rotate(0.14);
  ctx.strokeStyle = "#e3266e";
  ctx.lineWidth = 5;
  drawRoundedRect(ctx, -105, -58, 210, 116, 18);
  ctx.stroke();
  ctx.fillStyle = "#e3266e";
  ctx.font = "700 24px Quicksand, Arial, sans-serif";
  ctx.fillText("Reserved", 0, -8);
  ctx.fillText("For You ❤️", 0, 30);
  ctx.restore();

  ctx.fillStyle = "#b41554";
  ctx.font = "700 40px Quicksand, Arial, sans-serif";
  ctx.fillText(`Compatibility: ${compatibility}%`, 600, 1365);
  ctx.font = "700 54px Quicksand, Arial, sans-serif";
  ctx.fillText("❤️ CONFIRMED ❤️", 600, 1450);

  const link = document.createElement("a");
  link.download = "date-night-card.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function App() {
  const [plan, setPlan] = useState(getInitialState);
  const [direction, setDirection] = useState("forward");
  const [now, setNow] = useState(new Date());
  const [musicOn, setMusicOn] = useState(false);
  const [sparkles, setSparkles] = useState([]);
  const [runawayPosition, setRunawayPosition] = useState(defaultRunawayPosition);
  const audioRef = useRef(null);
  const lastSparkleRef = useRef(0);

  const selectedTime = useMemo(() => findOption(timeOptions, plan.time), [plan.time]);
  const selectedFood = useMemo(() => findOption(foodOptions, plan.food), [plan.food]);
  const selectedActivity = useMemo(() => findOption(activityOptions, plan.activity), [plan.activity]);
  const countdown = useMemo(() => getCountdown(plan.date, plan.time, now), [now, plan.date, plan.time]);
  const compatibility = useMemo(() => getCompatibilityScore(plan), [plan]);
  const isFinal = plan.step >= TOTAL_STEPS;

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  }, [plan]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!musicOn) {
      audioRef.current?.stop();
      audioRef.current = null;
      return undefined;
    }

    const context = new AudioContext();
    const gain = context.createGain();
    gain.gain.value = 0.025;
    gain.connect(context.destination);

    const notes = [261.63, 329.63, 392.0];
    const oscillators = notes.map((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index === 0 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index * 3;
      oscillator.connect(gain);
      oscillator.start();
      return oscillator;
    });

    audioRef.current = {
      stop: () => {
        gain.gain.setTargetAtTime(0, context.currentTime, 0.06);
        window.setTimeout(() => {
          oscillators.forEach((oscillator) => oscillator.stop());
          context.close();
        }, 180);
      },
    };

    return () => {
      audioRef.current?.stop();
      audioRef.current = null;
    };
  }, [musicOn]);

  const updatePlan = (patch) => {
    setPlan((current) => ({ ...current, ...patch }));
  };

  const goToStep = (step, nextDirection = "forward") => {
    setDirection(nextDirection);
    setPlan((current) => ({
      ...current,
      step: Math.min(TOTAL_STEPS, Math.max(0, step)),
    }));
  };

  const next = () => goToStep(plan.step + 1, "forward");
  const back = () => goToStep(plan.step - 1, "back");

  const reset = () => {
    setDirection("back");
    setPlan(defaultState);
    setRunawayPosition(defaultRunawayPosition);
  };

  const moveRunawayNo = (event) => {
    if (typeof window === "undefined") return;

    const buttonRect = event?.currentTarget?.getBoundingClientRect?.();
    const buttonWidth = buttonRect?.width ?? 124;
    const buttonHeight = buttonRect?.height ?? 54;
    const minX = 18;
    const minY = 78;
    const maxX = Math.max(minX, window.innerWidth - buttonWidth - 18);
    const maxY = Math.max(minY, window.innerHeight - buttonHeight - 18);
    const pointerX = event?.clientX ?? (buttonRect ? buttonRect.left + buttonWidth / 2 : window.innerWidth / 2);
    const pointerY = event?.clientY ?? (buttonRect ? buttonRect.top + buttonHeight / 2 : window.innerHeight / 2);
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    setRunawayPosition((current) => {
      const currentX = current.active ? current.x : buttonRect?.left ?? window.innerWidth / 2;
      const currentY = current.active ? current.y : buttonRect?.top ?? window.innerHeight / 2;
      const safeSpots = [
        { x: maxX, y: minY },
        { x: minX, y: Math.round(window.innerHeight * 0.24) },
        { x: maxX, y: Math.round(window.innerHeight * 0.56) },
        { x: minX, y: maxY },
        { x: Math.round(window.innerWidth * 0.5), y: maxY },
        { x: Math.round(window.innerWidth * 0.54), y: minY },
      ]
        .map((spot) => ({
          x: clamp(spot.x, minX, maxX),
          y: clamp(spot.y, minY, maxY),
        }))
        .sort((a, b) => {
          const distanceA = Math.hypot(a.x + buttonWidth / 2 - pointerX, a.y + buttonHeight / 2 - pointerY);
          const distanceB = Math.hypot(b.x + buttonWidth / 2 - pointerX, b.y + buttonHeight / 2 - pointerY);
          return distanceB - distanceA;
        });
      const target =
        safeSpots.find((spot) => Math.hypot(spot.x - currentX, spot.y - currentY) > 110) ?? safeSpots[0];

      return {
        ...current,
        active: true,
        x: target.x,
        y: target.y,
        rotation: Math.round(Math.random() * 20 - 10),
        moves: current.moves + 1,
      };
    });
  };

  const handlePointerMove = (event) => {
    const time = Date.now();
    if (time - lastSparkleRef.current < 80) return;
    lastSparkleRef.current = time;
    const sparkle = {
      id: `${time}-${Math.random()}`,
      x: event.clientX,
      y: event.clientY,
    };
    setSparkles((items) => [...items.slice(-18), sparkle]);
    window.setTimeout(() => {
      setSparkles((items) => items.filter((item) => item.id !== sparkle.id));
    }, 900);
  };

  return (
    <main className="date-app" onPointerMove={handlePointerMove}>
      <div className="ambient-hearts" aria-hidden="true">
        {Array.from({ length: 22 }, (_, index) => (
          <span key={index} style={{ "--i": index }}>
            {index % 4 === 0 ? "💕" : index % 3 === 0 ? "✦" : "♥"}
          </span>
        ))}
      </div>

      <div className="rising-hearts" aria-hidden="true">
        {Array.from({ length: 34 }, (_, index) => (
          <span key={index} style={{ "--i": index }}>
            {index % 5 === 0 ? "💗" : index % 3 === 0 ? "💕" : "♥"}
          </span>
        ))}
      </div>

      <div className="cursor-sparkles" aria-hidden="true">
        {sparkles.map((sparkle) => (
          <span key={sparkle.id} style={{ left: sparkle.x, top: sparkle.y }}>
            ✨
          </span>
        ))}
      </div>

      {isFinal && (
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 44 }, (_, index) => (
            <span key={index} style={{ "--i": index }}>
              {index % 2 === 0 ? "❤️" : "💕"}
            </span>
          ))}
        </div>
      )}

      <header className="top-bar">
        <button
          className="icon-button"
          type="button"
          aria-label={musicOn ? "Mute music" : "Play music"}
          onClick={() => setMusicOn((value) => !value)}
        >
          {musicOn ? <VolumeX size={18} /> : <Music size={18} />}
          <span>{musicOn ? "Mute" : "Music"}</span>
        </button>
        <button className="icon-button" type="button" aria-label="Reset planner" onClick={reset}>
          <RotateCcw size={18} />
          <span>Reset</span>
        </button>
      </header>

      {plan.step === 0 && runawayPosition.active && (
        <button
          className="runaway-button roaming"
          type="button"
          aria-label="No, broken heart"
          onMouseEnter={moveRunawayNo}
          onPointerMove={moveRunawayNo}
          onFocus={moveRunawayNo}
          onClick={moveRunawayNo}
          style={{
            left: `${runawayPosition.x}px`,
            top: `${runawayPosition.y}px`,
            transform: `rotate(${runawayPosition.rotation}deg)`,
          }}
        >
          No <span aria-hidden="true">💔</span>
        </button>
      )}

      <section className={`planner-shell ${isFinal ? "final-shell" : ""}`}>
        {!isFinal && (
          <div className="progress-wrap">
            <div className="step-label">💕 Step {plan.step + 1} of {TOTAL_STEPS}</div>
            <div className="progress-track" aria-hidden="true">
              <span style={{ width: `${((plan.step + 1) / TOTAL_STEPS) * 100}%` }} />
            </div>
          </div>
        )}

        <div className={`slide-card ${direction}`} key={plan.step}>
          {plan.step === 0 && (
            <IntroStep
              plan={plan}
              runawayPosition={runawayPosition}
              onChange={updatePlan}
              onYes={next}
              onNoDodge={moveRunawayNo}
            />
          )}
          {plan.step === 1 && <DateStep plan={plan} onChange={updatePlan} />}
          {plan.step === 2 && (
            <TimeStep plan={plan} selectedTime={selectedTime} onChange={updatePlan} />
          )}
          {plan.step === 3 && (
            <ChoiceStep
              eyebrow="🍽️"
              title="What should we eat?"
              options={foodOptions}
              selected={plan.food}
              onSelect={(food) => updatePlan({ food })}
            />
          )}
          {plan.step === 4 && (
            <ChoiceStep
              eyebrow="💕"
              title="And what are we doing afterwards?"
              options={activityOptions}
              selected={plan.activity}
              onSelect={(activity) => updatePlan({ activity })}
            />
          )}
          {plan.step === 5 && (
            <ExcitementStep
              plan={plan}
              compatibility={compatibility}
              onChange={updatePlan}
            />
          )}
          {isFinal && (
            <FinalStep
              plan={plan}
              selectedTime={selectedTime}
              selectedFood={selectedFood}
              selectedActivity={selectedActivity}
              countdown={countdown}
              compatibility={compatibility}
              onDownload={() => downloadDateCard(plan)}
            />
          )}
        </div>

        {!isFinal && plan.step > 0 && (
          <nav className="wizard-nav" aria-label="Date planner navigation">
            <button className="secondary-button" type="button" onClick={back}>
              <ChevronLeft size={18} />
              Back
            </button>
            <button className="primary-button" type="button" onClick={next}>
              {plan.step === TOTAL_STEPS - 1 ? "Reveal Date" : "Next"}
              <ChevronRight size={18} />
            </button>
          </nav>
        )}
      </section>
    </main>
  );
}

function IntroStep({ plan, runawayPosition, onChange, onYes, onNoDodge }) {
  return (
    <section className="intro-step">
      <div className="stamp">Reserved For You ❤️</div>
      <p className="tiny-script">mini date planner</p>
      <h1>Will you go on a date with me? 💕</h1>

      <div className="name-grid">
        <label>
          For
          <input
            value={plan.guestName}
            onChange={(event) => onChange({ guestName: event.target.value })}
            placeholder="Her name"
          />
        </label>
        <label>
          Reserved by
          <input
            value={plan.inviterName}
            onChange={(event) => onChange({ inviterName: event.target.value })}
            placeholder="Your name"
          />
        </label>
      </div>

      <div className="intro-actions">
        <button className="yes-button" type="button" onClick={onYes}>
          Yes <Heart size={20} fill="currentColor" />
        </button>
        {!runawayPosition.active && (
          <button
            className="runaway-button"
            type="button"
            aria-label="No, broken heart"
            onMouseEnter={onNoDodge}
            onPointerMove={onNoDodge}
            onFocus={onNoDodge}
            onClick={onNoDodge}
          >
            No <span aria-hidden="true">💔</span>
          </button>
        )}
      </div>
    </section>
  );
}

function DateStep({ plan, onChange }) {
  return (
    <section className="date-step">
      <p className="tiny-script">Pick a day for our adventure 💕</p>
      <h2>When should our adventure begin?</h2>
      <input
        className="date-input"
        type="date"
        value={plan.date}
        onChange={(event) => onChange({ date: event.target.value })}
      />

      <div className="live-summary">
        <Sparkles size={22} />
        <div>
          <strong>📅 {formatDate(plan.date)}</strong>
          <span>✨ Excellent choice. The stars approve.</span>
        </div>
      </div>
    </section>
  );
}

function TimeStep({ plan, selectedTime, onChange }) {
  return (
    <section className="time-step">
      <p className="tiny-script">Okay gorgeous</p>
      <h2>When should our adventure begin? 💖</h2>
      <label className="select-label">
        <span>Time</span>
        <select value={plan.time} onChange={(event) => onChange({ time: event.target.value })}>
          {timeOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.time} — {option.description}
            </option>
          ))}
        </select>
      </label>

      <div className="time-description">
        <span>{selectedTime.time}</span>
        <strong>{selectedTime.description}</strong>
      </div>
    </section>
  );
}

function ChoiceStep({ eyebrow, title, options, selected, onSelect }) {
  return (
    <section className="choice-step">
      <p className="tiny-script">{eyebrow}</p>
      <h2>{title}</h2>
      <div className="choice-grid">
        {options.map((option) => {
          const isSelected = selected === option.id;
          return (
            <button
              key={option.id}
              className={`choice-card ${isSelected ? "selected" : ""}`}
              type="button"
              onClick={() => onSelect(option.id)}
              aria-pressed={isSelected}
            >
              <span className="choice-emoji">{option.emoji}</span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ExcitementStep({ plan, compatibility, onChange }) {
  return (
    <section className="excitement-step">
      <p className="tiny-script">One final question... 💕</p>
      <h2>How excited are you?</h2>
      <div className="slider-head">
        <span>😐</span>
        <strong>{plan.excitement}%</strong>
        <span>😍</span>
      </div>
      <input
        className="excited-slider"
        type="range"
        min="0"
        max="100"
        value={plan.excitement}
        onChange={(event) => onChange({ excitement: Number(event.target.value) })}
        style={{ "--value": `${plan.excitement}%` }}
      />
      <div className="excitement-label">{getExcitementLabel(plan.excitement)}</div>

      <div className="compatibility-meter">
        <div>
          <span>Our compatibility score</span>
          <strong>{compatibility}%</strong>
        </div>
        <div className="compatibility-track" aria-hidden="true">
          <span style={{ width: `${compatibility}%` }} />
        </div>
      </div>
    </section>
  );
}

function FinalStep({
  plan,
  selectedTime,
  selectedFood,
  selectedActivity,
  countdown,
  compatibility,
  onDownload,
}) {
  return (
    <section className="final-step">
      <div className="final-heading">
        <p>💌 OFFICIAL DATE INVITATION 💌</p>
        <h2>💕 Date Reserved 💕</h2>
      </div>

      <div className="postcard-wrap">
        <div className="postcard-rising-hearts" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => (
            <span key={index} style={{ "--i": index }}>
              {index % 3 === 0 ? "💕" : "♥"}
            </span>
          ))}
        </div>
        <article className="postcard" aria-label="Official date invitation postcard">
          <div className="postcard-stamp">Reserved For You ❤️</div>
          <div className="postcard-title">DATE NIGHT</div>
          <div className="postcard-rule" />

          <DetailRow label="For" value={`${plan.guestName || defaultState.guestName} ❤️`} />
          <DetailRow label="Date" value={formatDate(plan.date, { weekday: undefined })} />
          <DetailRow label="Time" value={selectedTime.time} note={selectedTime.description} />
          <DetailRow label="Food" value={`${selectedFood.emoji} ${selectedFood.label}`} />
          <DetailRow label="Activity" value={`${selectedActivity.emoji} ${selectedActivity.label}`} />
          <DetailRow label="Excitement" value={`${plan.excitement}%`} note={getExcitementLabel(plan.excitement)} />

          <div className="postcard-rule" />
          <DetailRow label="Dress Code" value="Absolutely Adorable ❤️" />
          <DetailRow label="Reserved By" value={plan.inviterName || defaultState.inviterName} />

          <div className="confirmed">❤️ CONFIRMED ❤️</div>
        </article>
      </div>

      <div className="final-side">
        <div className="countdown">
          <p>💕 Countdown Until Date 💕</p>
          {countdown.arrived ? (
            <strong>Date night is here</strong>
          ) : (
            <div className="countdown-grid">
              <span><strong>{countdown.days}</strong> Days</span>
              <span><strong>{countdown.hours}</strong> Hours</span>
              <span><strong>{countdown.minutes}</strong> Minutes</span>
            </div>
          )}
        </div>
        <div className="compatibility-final">
          <span>Our compatibility score</span>
          <strong>{compatibility}%</strong>
          <div className="compatibility-track" aria-hidden="true">
            <span style={{ width: `${compatibility}%` }} />
          </div>
        </div>
        <div className="download-actions">
          <button className="primary-button" type="button" onClick={onDownload}>
            <Camera size={18} />
            Generate Our Date Card 📸
          </button>
          <button className="secondary-button" type="button" onClick={onDownload}>
            <Download size={18} />
            Save Our Date ❤️
          </button>
        </div>
      </div>
    </section>
  );
}

function DetailRow({ label, value, note }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <em>{note}</em>}
    </div>
  );
}

export default App;

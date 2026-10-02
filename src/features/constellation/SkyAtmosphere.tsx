import type { CSSProperties } from 'react'
import { AmbientCanvas } from './AmbientCanvas'
import { useTheme } from './useTheme'

const cloudShapes = [
  'M-200 265 C-70 185 95 252 210 207 C340 151 470 213 585 185 C715 151 825 242 954 196 C1092 153 1190 211 1320 180 C1425 155 1535 212 1640 198 L1640 480 L-200 480Z',
  'M-200 300 C-35 270 22 181 188 224 C309 252 365 174 487 212 C622 255 765 162 889 221 C1020 270 1128 194 1244 235 C1350 280 1470 204 1640 259 L1640 480 L-200 480Z',
  'M-200 270 C-50 180 115 201 247 230 C390 259 460 186 610 210 C760 234 831 170 984 206 C1129 240 1290 181 1420 205 C1500 220 1560 214 1640 245 L1640 480 L-200 480Z',
]

export function SkyAtmosphere() {
  const { visual } = useTheme()
  const style = {
    '--sunrise': visual.sunriseWeight, '--daylight': visual.daylightWeight,
    '--sunset': visual.sunsetWeight, '--night': visual.nightWeight,
    '--cloud-visibility': visual.cloudVisibility,
    '--warmth': visual.horizonWarmth,
  } as CSSProperties
  return (
    <div className="sky-atmosphere" style={style} aria-hidden="true">
      <div className="sky-layer sky-layer--night" />
      <div className="sky-layer sky-layer--sunrise" />
      <div className="sky-layer sky-layer--daylight" />
      <div className="sky-layer sky-layer--sunset" />
      <div className="sky-light" />
      <AmbientCanvas visual={visual} />
      <div className="clouds">
        {cloudShapes.map((path, index) => (
          <div key={index} className={`cloud-band cloud-band--${index}`}>
            <svg viewBox="0 0 1440 480" preserveAspectRatio="none">
              <defs><linearGradient id={`cloud-fill-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f0f6fa" stopOpacity="0.1" />
                <stop offset="0.5" stopColor="#edf4f7" stopOpacity="0.65" />
                <stop offset="1" stopColor="#eeb99d" stopOpacity={visual.horizonWarmth * 0.55} />
              </linearGradient></defs>
              <path d={path} fill={`url(#cloud-fill-${index})`} />
            </svg>
          </div>
        ))}
      </div>
      <div className="sky-horizon" />
    </div>
  )
}

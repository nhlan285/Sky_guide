import { useId } from 'react'
import type { CSSProperties } from 'react'
import { AmbientCanvas } from './AmbientCanvas'
import { useTheme } from './useTheme'

const cloudShapes = [
  'M-100 270 C60 250 130 200 270 216 C335 172 438 184 508 212 C630 200 648 256 782 258 C913 236 1090 261 1220 278 C1020 290 945 316 802 305 C607 340 477 300 310 318 C148 303 40 302-100 320Z',
  'M180 285 C295 268 330 201 449 219 C502 126 656 124 727 181 C804 171 842 222 869 244 C1018 217 1130 244 1210 276 C1364 267 1475 306 1570 320 C1410 341 1296 320 1150 353 C970 342 859 375 696 340 C511 373 314 335 180 331Z',
  'M-160 315 C-12 287 14 219 150 244 C203 168 320 166 396 218 C510 178 610 246 659 271 C779 252 876 303 966 318 C1132 291 1370 315 1540 354 L1540 480 L-160 480Z',
]

export function SkyAtmosphere() {
  const { visual } = useTheme()
  const id = useId()
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
      <div className="sky-day-haze" />
      <AmbientCanvas visual={visual} />
      <div className="clouds">
        {cloudShapes.map((path, index) => (
          <div key={index} className={`cloud-band cloud-band--${index}`}>
            <svg viewBox="0 0 1440 480" preserveAspectRatio="none" focusable="false">
              <defs>
                <linearGradient id={`${id}-cloud-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#f5fafc" stopOpacity=".85" />
                  <stop offset=".4" stopColor="#e6eff6" stopOpacity=".7" />
                  <stop offset="1" stopColor="#9bb9cf" stopOpacity=".08" />
                </linearGradient>
                <linearGradient id={`${id}-warm-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset=".25" stopColor="#c295a4" stopOpacity="0" />
                  <stop offset=".7" stopColor="#efb99a" stopOpacity=".75" />
                  <stop offset="1" stopColor="#edc29e" stopOpacity=".1" />
                </linearGradient>
              </defs>
              <path d={path} fill={`url(#${id}-cloud-${index})`} />
              <path d={path} fill={`url(#${id}-warm-${index})`} opacity={visual.horizonWarmth} />
              <path d={path} fill={`url(#${id}-cloud-${index})`} transform="translate(90 74) scale(.87 .78)" opacity=".3" />
            </svg>
          </div>
        ))}
      </div>
      <div className="sky-horizon" />
    </div>
  )
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { MuseumExhibit1970s } from './historicalCatalog';

interface MuseumExhibitIllustrationProps {
  exhibit: MuseumExhibit1970s;
  className?: string;
}

export function MuseumExhibitIllustration({
  exhibit,
  className = '',
}: MuseumExhibitIllustrationProps) {
  const titleId = `museum-illustration-${exhibit.id}`;

  return (
    <svg
      role="img"
      aria-labelledby={titleId}
      viewBox="0 0 320 180"
      className={className}
      shapeRendering="crispEdges"
    >
      <title id={titleId}>
        Ilustración original de PIXELVERSE: {exhibit.title} ({exhibit.year})
      </title>
      <rect width="320" height="180" fill="#08121f" />
      <path d="M0 145H320" stroke="#284052" strokeWidth="2" />
      <path d="M16 20H304V160H16Z" fill="#101d2c" stroke={exhibit.accentHex} strokeWidth="3" />
      {exhibit.illustration === 'computer-space' && (
        <>
          <path d="M98 132 82 48 160 30 238 48 222 132Z" fill="#334155" stroke="#cbd5e1" strokeWidth="3" />
          <path d="M111 53 160 41 209 53 199 112 121 112Z" fill="#050a12" stroke={exhibit.accentHex} strokeWidth="3" />
          <path d="m151 69 14-10 10 14-13 13Z" fill={exhibit.accentHex} />
          <circle cx="141" cy="91" r="3" fill="#fff" />
          <circle cx="181" cy="88" r="3" fill="#fff" />
        </>
      )}
      {exhibit.illustration === 'odyssey' && (
        <>
          <rect x="80" y="108" width="160" height="18" fill="#64748b" stroke="#e2e8f0" strokeWidth="3" />
          <rect x="101" y="52" width="118" height="48" fill="#07111d" stroke="#94a3b8" strokeWidth="3" />
          <path d="M112 63H208V91H112Z" fill="none" stroke={exhibit.accentHex} strokeWidth="2" />
          <path d="M130 67V87M190 67V87M156 76H164" stroke="#f8fafc" strokeWidth="4" />
          <path d="M120 101H200" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" />
        </>
      )}
      {exhibit.illustration === 'pong' && (
        <>
          <rect x="78" y="46" width="164" height="82" fill="#020617" stroke="#e2e8f0" strokeWidth="3" />
          <path d="M160 52V122" stroke="#64748b" strokeWidth="3" strokeDasharray="5 5" />
          <path d="M100 68V106M220 68V106" stroke="#fff" strokeWidth="7" />
          <rect x="153" y="83" width="14" height="10" fill={exhibit.accentHex} />
          <path d="M105 139H215" stroke={exhibit.accentHex} strokeWidth="3" />
        </>
      )}
      {exhibit.illustration === 'racing' && (
        <>
          <path d="M112 40H208L235 126H85Z" fill="#182a25" stroke="#eab308" strokeWidth="3" />
          <path d="M151 48H169V70H151ZM151 84H169V106H151Z" fill="#d6bc88" />
          <path d="m109 76 12-5M199 105l14-6" stroke="#f97316" strokeWidth="5" />
          <path d="M135 125H185" stroke="#f8fafc" strokeWidth="3" />
          <circle cx="160" cy="122" r="15" fill="none" stroke={exhibit.accentHex} strokeWidth="3" />
        </>
      )}
      {exhibit.illustration === 'breakout' && (
        <>
          {['#ef4444', '#f97316', '#22c55e', '#facc15'].map((color, row) => (
            <path
              key={color}
              d={`M94 ${52 + row * 14}H142M148 ${52 + row * 14}H196M202 ${52 + row * 14}H226`}
              stroke={color}
              strokeWidth="9"
            />
          ))}
          <circle cx="162" cy="120" r="5" fill="#fff" />
          <path d="M142 134H182" stroke={exhibit.accentHex} strokeWidth="6" />
        </>
      )}
      {exhibit.illustration === 'invaders' && (
        <>
          <path d="m145 55 14-12 14 12h10v12h-8v8h-8v-8h-16v8h-8v-8h-8V55Z" fill={exhibit.accentHex} />
          <path d="m108 84 14-12 14 12h10v12h-8v8h-8v-8h-16v8h-8v-8h-8V84Z" fill="#86efac" />
          <path d="m182 84 14-12 14 12h10v12h-8v8h-8v-8h-16v8h-8v-8h-8V84Z" fill="#86efac" />
          <path d="M98 121H222" stroke="#64748b" strokeWidth="5" />
          <path d="M154 130H166V118H154Z" fill="#facc15" />
        </>
      )}
      {exhibit.illustration === 'lunar-lander' && (
        <>
          <path d="M66 127 104 119 128 125 151 115 179 122 207 114 254 127" fill="none" stroke="#cbd5e1" strokeWidth="3" />
          <path d="m145 89 15-26 15 26-7 8h-16Z" fill="none" stroke={exhibit.accentHex} strokeWidth="3" />
          <path d="M151 98 143 111M169 98 177 111M160 96V112" stroke="#facc15" strokeWidth="3" />
          <path d="M116 145H204" stroke="#64748b" strokeWidth="2" strokeDasharray="5 5" />
        </>
      )}
      {exhibit.illustration === 'asteroids' && (
        <>
          <path d="m160 47 13 24-10 5 17 11-20 2-9-8-14 5 7-16Z" fill="#64748b" stroke="#cbd5e1" strokeWidth="2" />
          <path d="m104 105 10-15 15 4 4 13-12 12-14-4ZM207 104l8-12 13 3 5 12-11 9-12-3Z" fill="#475569" stroke="#cbd5e1" strokeWidth="2" />
          <path d="m159 103 12 23h-24Z" fill="none" stroke={exhibit.accentHex} strokeWidth="3" />
          <circle cx="87" cy="65" r="2" fill="#fff" />
          <circle cx="237" cy="59" r="2" fill="#fff" />
        </>
      )}
      {exhibit.illustration === 'arcade-maze' && (
        <>
          <path
            d="M82 53H238V72H108V92H218V112H82V132H238"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="8"
          />
          <circle cx="125" cy="62" r="7" fill="#f472b6" />
          <circle cx="195" cy="121" r="7" fill="#67e8f9" />
          <path d="M116 49 125 43 134 49V56H116ZM186 108 195 102 204 108V115H186Z" fill="#f8fafc" />
        </>
      )}
      {exhibit.illustration === 'tank-duel' && (
        <>
          <path d="M78 47H144V66H118V86H171V106H138V132H78ZM192 47H242V74H216V94H242V132H181V113H205V94H181V74H192Z" fill="none" stroke="#64748b" strokeWidth="7" />
          <path d="M96 80H126V100H96Z" fill="#84cc16" stroke="#e2e8f0" strokeWidth="2" />
          <path d="M198 104H228V124H198Z" fill="#f97316" stroke="#e2e8f0" strokeWidth="2" />
          <path d="M111 78V69M213 102V94" stroke="#f8fafc" strokeWidth="4" />
          <path d="M160 56 165 63 158 70 165 77" fill="none" stroke="#facc15" strokeWidth="3" />
        </>
      )}
      {exhibit.illustration === 'gun-duel' && (
        <>
          <path d="M112 59 130 45 148 59V83H112ZM172 59 190 45 208 59V83H172Z" fill="#475569" stroke="#e2e8f0" strokeWidth="2" />
          <path d="M111 84 145 75M209 84 175 75" stroke={exhibit.accentHex} strokeWidth="4" />
          <path d="M160 43V132" stroke="#64748b" strokeWidth="2" strokeDasharray="5 6" />
          <path d="M96 119H132M188 119H224" stroke="#cbd5e1" strokeWidth="5" />
          <circle cx="106" cy="104" r="3" fill="#facc15" />
          <circle cx="214" cy="104" r="3" fill="#facc15" />
        </>
      )}
      {exhibit.illustration === 'death-race' && (
        <>
          <path d="M102 44H218L236 131H84Z" fill="#17202b" stroke="#94a3b8" strokeWidth="3" />
          <path d="M147 48H173L185 128H135Z" fill="#263343" />
          <path d="m135 79 15-9h24l15 9-4 25h-46Z" fill="#64748b" stroke={exhibit.accentHex} strokeWidth="3" />
          <path d="M126 57 138 54M190 56 201 52M102 114 119 109M203 112 220 107" stroke="#f8fafc" strokeWidth="3" />
          <path d="M122 133H198" stroke="#f43f5e" strokeWidth="3" />
        </>
      )}
      {exhibit.illustration === 'space-wars' && (
        <>
          <circle cx="160" cy="90" r="12" fill="#e0e7ff" />
          <path d="m108 58 24 13-24 13 4-13ZM212 96l-24 13 24 13-4-13Z" fill="none" stroke={exhibit.accentHex} strokeWidth="3" />
          <path d="M129 70 181 108M191 68 139 110" stroke="#c4b5fd" strokeWidth="2" strokeDasharray="4 5" />
          <circle cx="95" cy="103" r="2" fill="#fff" />
          <circle cx="224" cy="58" r="2" fill="#fff" />
          <circle cx="183" cy="48" r="2" fill="#fff" />
        </>
      )}
      {exhibit.illustration === 'galaxian' && (
        <>
          <path d="m151 49 9-10 9 10h8v8h-7v7h-7v-6h-6v6h-7v-7h-7v-8Z" fill={exhibit.accentHex} />
          <path d="m109 68 8-9 8 9h7v7h-6v6h-6v-5h-6v5h-6v-6h-6v-7ZM193 68l8-9 8 9h7v7h-6v6h-6v-5h-6v5h-6v-6h-6v-7Z" fill="#f472b6" />
          <path d="m91 104 8-8 8 8 11 6-11 3-8-4-8 4Z" fill="#facc15" />
          <path d="m201 107 8-8 8 8 11 6-11 3-8-4-8 4Z" fill="#facc15" />
          <path d="M148 127H172" stroke="#e2e8f0" strokeWidth="4" />
        </>
      )}
      <text
        x="160"
        y="153"
        textAnchor="middle"
        fill="#e2e8f0"
        fontFamily="monospace"
        fontSize="10"
      >
        {exhibit.year} · ARCHIVO PIXELVERSE
      </text>
    </svg>
  );
}

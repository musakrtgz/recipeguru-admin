<template>
  <div
    class="relative flex min-h-64 items-center justify-center"
    aria-hidden="true"
  >
    <div class="login-orbit absolute size-64 rounded-full lg:size-96" />
    <div class="login-orbit absolute size-48 rounded-full lg:size-72" />
    <svg
      viewBox="0 0 500 360"
      class="relative w-full max-w-md drop-shadow-xl"
    >
      <ellipse
        cx="249"
        cy="307"
        rx="138"
        ry="16"
        fill="currentColor"
        opacity=".05"
      />
      <path
        d="M112 182c0 71 48 129 137 129s139-58 139-129z"
        fill="var(--ui-primary)"
      />
      <ellipse
        cx="250"
        cy="180"
        rx="139"
        ry="60"
        fill="var(--ui-bg)"
      />
      <ellipse
        cx="250"
        cy="180"
        rx="122"
        ry="48"
        fill="var(--ui-primary)"
        opacity=".18"
      />
      <g
        fill="none"
        stroke="var(--ui-primary)"
        stroke-width="8"
        stroke-linecap="round"
      >
        <path
          d="M157 174c22-52 69 10 100-19s65 4 83 20M158 191c31-38 63 15 91-9s55-7 85 4M182 210c22-31 52 7 74-14s41-2 57 10"
        />
      </g>
      <g fill="#6e8960">
        <path
          d="M194 151c-31-4-38-27-31-40 22 1 38 15 31 40M279 154c1-28 22-46 43-41 1 22-14 39-43 41M231 189c-21 4-34-6-35-24 22-6 35 5 35 24"
        />
      </g>
      <g fill="#d86d4b">
        <circle
          cx="218"
          cy="158"
          r="11"
        />
        <circle
          cx="300"
          cy="185"
          r="12"
        />
        <circle
          cx="179"
          cy="187"
          r="8"
        />
      </g>
      <path
        d="M354 154l69-104"
        stroke="var(--ui-text)"
        stroke-width="9"
        stroke-linecap="round"
      />
      <path
        d="M368 162l69-104"
        stroke="var(--ui-text)"
        stroke-width="9"
        stroke-linecap="round"
      />
      <path
        d="M216 92c-16-22 16-27 0-49m40 42c-16-22 16-27 0-49"
        stroke="var(--ui-primary)"
        stroke-width="3"
        stroke-linecap="round"
        fill="none"
        opacity=".5"
      />
    </svg>
    <div
      class="absolute right-0 bottom-9 flex rotate-3 items-center gap-3 rounded-2xl border border-default bg-default p-3 shadow-sm lg:right-2"
    >
      <div class="flex size-9 items-center justify-center rounded-xl bg-success/10 text-success">
        <UIcon
          name="i-lucide-chef-hat"
          class="size-5"
        />
      </div>
      <div>
        <p class="text-xs font-semibold text-highlighted">
          İyi tarifler, güçlü topluluk.
        </p>
        <p class="mt-1 text-[10px] text-muted">
          Birlikte daha lezzetli.
        </p>
      </div>
    </div>
  </div>
</template>

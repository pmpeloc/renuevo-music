import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const home = readFileSync('src/app/home/page.tsx', 'utf8');

test('centers today using the rendered date button dimensions', () => {
  assert.match(home, /const todayRef = useRef<HTMLButtonElement>\(null\)/);
  assert.match(home, /todayButton\.offsetLeft[\s\S]*todayButton\.offsetWidth/);
  assert.match(home, /ref=\{isSameDay\(date, today\) \? todayRef : undefined\}/);
  assert.doesNotMatch(home, /const itemWidth = 52;[\s\S]*todayIndex/);
});

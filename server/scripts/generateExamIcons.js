import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(here, '../../client/public/assets/exams');
const icons = {
  ssc: ['SSC', '#2558D5', '#EAF0FF'], rrb: ['RRB', '#C85B18', '#FFF0E4'], dsssb: ['DS', '#5B4FC8', '#EFEDFF'],
  kvs: ['KVS', '#236AA7', '#E6F3FF'], emrs: ['EM', '#7A4D2A', '#F8EEE5'], nvs: ['NVS', '#276B62', '#E5F5F1'],
  csir: ['CS', '#126D8E', '#E4F4FA'], cbse: ['CB', '#365DB7', '#EAF0FF'], bsf: ['BSF', '#28734C', '#E6F5EB'],
  aiims: ['AI', '#176F65', '#E3F5F1'], upsssc: ['UP', '#A34D36', '#FBECE8'], 'delhi-police': ['DP', '#9D343C', '#FBE8EA'],
  dda: ['DDA', '#A65D1B', '#FFF0DF'], ccras: ['AY', '#38743A', '#EAF5E8'], rssb: ['RS', '#A44E4E', '#F9E9E9'],
  'up-police': ['UP', '#2B4B84', '#E8EEF9'], practice: ['Aa', '#4E5C73', '#EDF0F5'], 'supreme-court': ['SC', '#6D4A24', '#F6EDE3'],
  'mp-cpct': ['MP', '#6F4AB1', '#F0EAFE'], 'allahabad-hc': ['AH', '#78482D', '#F5EBE5'], 'uttarakhand-hc': ['UK', '#28766C', '#E5F4F1'],
  'jharkhand-hc': ['JH', '#41723C', '#EAF4E8'], 'delhi-hc': ['DH', '#5B477D', '#F0ECF7'], 'bombay-hc': ['BH', '#81413C', '#F7EAE9'],
  chandigarh: ['CH', '#326C8D', '#E7F2F8'], rvunl: ['RV', '#B05C20', '#FBEDE2']
};

await mkdir(output, { recursive: true });
for (const [file, [letters, color, background]] of Object.entries(icons)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-labelledby="title"><title>${letters} organization mark</title><rect width="96" height="96" rx="24" fill="${background}"/><path d="M48 13 76 24v21c0 18-11.5 31.8-28 38-16.5-6.2-28-20-28-38V24l28-11Z" fill="none" stroke="${color}" stroke-width="4"/><path d="M31 33h34M35 28v10M61 28v10" stroke="${color}" stroke-width="3" stroke-linecap="round" opacity=".55"/><text x="48" y="58" text-anchor="middle" dominant-baseline="middle" fill="${color}" font-family="Arial, sans-serif" font-size="${letters.length > 2 ? 18 : 22}" font-weight="700" letter-spacing=".5">${letters}</text><path d="M36 68h24" stroke="${color}" stroke-width="3" stroke-linecap="round" opacity=".55"/></svg>`;
  await writeFile(path.join(output, `${file}.svg`), svg);
}
console.log(`Generated ${Object.keys(icons).length} original SVG exam icons in ${output}`);

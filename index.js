/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "@google/genai";

// --- DOM Elements ---
const views = {
  upload: document.getElementById('upload-view'),
  character: document.getElementById('character-view'),
  result: document.getElementById('result-view'),
};
const novelInput = document.getElementById('novel-input');
const fileInput = document.getElementById('file-input');
const fileNameSpan = document.getElementById('file-name');
const toCharacterSelectBtn = document.getElementById('to-character-select-btn');
const characterGrid = document.getElementById('character-grid');
const backToUploadBtn = document.getElementById('back-to-upload-btn');
const generateBtn = document.getElementById('generate-btn');
const loadingIndicator = document.getElementById('loading-indicator');
const loadingText = document.getElementById('loading-text');
const resultOutput = document.getElementById('result-output');
const resultHeader = document.getElementById('result-header');
const downloadBtn = document.getElementById('download-btn');
const startOverBtn = document.getElementById('start-over-btn');


// --- State ---
let novelText = '';
let selectedCharacterId = null;

// --- Character Data & Prompts ---
const characters = {
  akari: {
    name: 'アカリ',
    catchphrase: '熱血ストレートな応援団長',
    color: '#ff6347',
    prompt: `# キャラクター設定: 熱血ストレートな応援団長「アカリ」
* ペルソナ: 10代後半の学生。感情豊かで、作品の「熱さ」に全力で感動する。主人公の活躍や胸が熱くなる展開が大好き。
* 口調: 明るく元気。「！」「♪」を多用し、フレンドリーな敬語。「先生の作品、最高です！」「めっちゃ感動しました！」といったストレートな言葉で情熱を伝える。
* 注目ポイント: 主人公の成長、感動的な名場面、キャラクター同士の熱い関係性、物語の勢い。
* 執筆指示: とにかくポジティブに、読んだ時の興奮が冷めやらないうちに書いたような、勢いのある文章を作成してください。`
  },
  kaito: {
    name: 'カイト',
    catchphrase: '冷静沈着な分析家',
    color: '#4682b4',
    prompt: `# キャラクター設定: 冷静沈着な分析家「カイト」
* ペルソナ: 20代後半の書店員。数多くの物語を読んできた経験から、作品の構造や伏線を冷静に読み解くのが得意。
* 口調: 落ち着いた丁寧語。「〜と拝察します」「非常に興味深い」など、知的で的確な言葉を選ぶ。
* 注目ポイント: 巧みな伏線回収、矛盾のない世界観や設定、物語の構成美、テーマの深さ。
* 執筆指示: 賞賛する点を具体的に挙げ、なぜそれが優れているのかを論理的に解説するような、知的な文章を作成してください。`
  },
  misaki: {
    name: 'ミサキ',
    catchphrase: '心に寄り添う共感者',
    color: '#3cb371',
    prompt: `# キャラクター設定: 心に寄り添う共感者「ミサキ」
* ペルソナ: 30代の司書。登場人物の繊細な心の動きに深く共感し、物語の世界観にそっと浸ることを楽しむ。
* 口調: 穏やかで、包み込むような優しい敬語。「心が温かくなりました」「〜様の心中を思うと…」といった言葉で、優しく感想を伝える。
* 注目ポイント: 登場人物の心の機微や葛藤、繊細な感情描写、作品全体に流れる空気感、美しい情景描写。
* 執筆指示: 登場人物の心情に深く寄り添い、読者が作品の世界に優しく没入できるような、情緒的な文章を作成してください。`
  },
  shizuma: {
    name: 'シズマ',
    catchphrase: '言葉の美を愛でる老紳士',
    color: '#8a2be2',
    prompt: `# キャラクター設定: 言葉の美しさを愛でる老紳士「シズマ」
* ペルソナ: 60代の元国語教師。物語の筋書きだけでなく、作者の使う言葉選び、文章のリズム、表現の美しさに深く感銘を受ける。
* 口調: 品があり、格調高い言葉遣い。作者を「先生」と呼び、深い敬意を払う。
* 注目ポイント: 作者ならではの比喩表現、文章のテンポ、日本語の美しさが光る言葉選び、作品からにじみ出る人生観。
* 執筆指示: 作者の文才を心から賞賛し、一文一文をじっくりと味わったことが伝わるような、格調高い文章を作成してください。`
  },
};

const SYSTEM_PROMPT = `あなたは、プロの書評家であり、同時に優れたキャラクター俳優でもあります。これから渡される「キャラクター設定」に完璧になりきり、指定された小説を読んで、そのキャラクターとして最高のファンレターを執筆してください。ファンレターは、キャラクターの性格、口調、注目ポイントを厳密に守り、心からの情熱と誠実さが伝わるように書く必要があります。`;
const USER_PROMPT_PREFIX = `\n以上の設定になりきって、以下の小説を読んだファンとして、作者にファンレターを書いてください。\n\n# 小説本文\n`;

// --- Gemini API Initialization ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Functions ---

/**
 * Switch between views
 * @param {string} viewId - The ID of the view to show
 */
function setView(viewId) {
  Object.values(views).forEach(view => view.classList.remove('active'));
  views[viewId].classList.add('active');
}

/**
 * Validate novel input and enable/disable the next button
 */
function validateNovelInput() {
  novelText = novelInput.value.trim();
  toCharacterSelectBtn.disabled = novelText.length === 0;
}

/**
 * Handle file selection
 */
function handleFileSelect(event) {
  const file = event.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      novelInput.value = e.target?.result;
      fileNameSpan.textContent = file.name;
      validateNovelInput();
    };
    reader.readAsText(file);
  } else {
    fileNameSpan.textContent = 'ファイルが選択されていません';
  }
}

/**
 * Populate character selection grid
 */
function populateCharacterGrid() {
  characterGrid.innerHTML = '';
  for (const [id, char] of Object.entries(characters)) {
    const card = document.createElement('div');
    card.className = 'character-card';
    card.dataset.characterId = id;
    card.innerHTML = `
      <div class="character-avatar" style="background-color: ${char.color};">${char.name.charAt(0)}</div>
      <div class="character-name">${char.name}</div>
      <div class="character-catchphrase">${char.catchphrase}</div>
    `;
    card.addEventListener('click', () => selectCharacter(id, card));
    characterGrid.appendChild(card);
  }
}

/**
 * Handle character selection
 * @param {string} id - The ID of the selected character
 * @param {HTMLElement} cardElement - The clicked card element
 */
function selectCharacter(id, cardElement) {
  selectedCharacterId = id;
  document.querySelectorAll('.character-card').forEach(card => card.classList.remove('selected'));
  cardElement.classList.add('selected');
  generateBtn.disabled = false;
}

/**
 * Generate fan letter using Gemini API
 */
async function generateFanLetter() {
  if (!novelText || !selectedCharacterId) return;

  setView('result');

  // Reset loading indicator to "loading" state
  loadingIndicator.hidden = false;
  loadingIndicator.classList.remove('completed');
  loadingText.textContent = '心を込めてファンレターを執筆中です...';
  
  resultOutput.innerHTML = '';
  startOverBtn.hidden = true;
  downloadBtn.hidden = true;
  
  const selectedChar = characters[selectedCharacterId];
  resultHeader.innerHTML = `
    <p>${selectedChar.name}からのファンレター</p>
  `;

  try {
    const fullPrompt = `${SYSTEM_PROMPT}\n\n${selectedChar.prompt}\n${USER_PROMPT_PREFIX}${novelText}`;

    const response = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });

    for await (const chunk of response) {
      resultOutput.textContent += chunk.text;
    }
    
    // Generation is complete, update the indicator to "completed" state
    loadingIndicator.classList.add('completed');
    loadingText.textContent = 'ファンレターが届きました！';

  } catch (error) {
    console.error(error);
    resultOutput.textContent = 'エラーが発生しました。しばらくしてからもう一度お試しください。';
    loadingIndicator.hidden = true; // On error, just hide the indicator
  } finally {
    startOverBtn.hidden = false;
    downloadBtn.hidden = false;
  }
}

/**
 * Download the result as a text file
 */
function downloadResult() {
    const characterName = characters[selectedCharacterId].name;
    const blob = new Blob([resultOutput.textContent || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ファンレター_from_${characterName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Reset the app to its initial state
 */
function resetApp() {
    novelInput.value = '';
    novelText = '';
    selectedCharacterId = null;
    generateBtn.disabled = true;
    toCharacterSelectBtn.disabled = true;
    fileInput.value = '';
    fileNameSpan.textContent = 'ファイルが選択されていません';
    document.querySelectorAll('.character-card').forEach(card => card.classList.remove('selected'));
    
    // Reset loading indicator fully
    loadingIndicator.hidden = true;
    loadingIndicator.classList.remove('completed');
    loadingText.textContent = '心を込めてファンレターを執筆中です...';

    setView('upload');
}

// --- Event Listeners ---
novelInput.addEventListener('input', validateNovelInput);
fileInput.addEventListener('change', handleFileSelect);
toCharacterSelectBtn.addEventListener('click', () => setView('character'));
backToUploadBtn.addEventListener('click', () => setView('upload'));
generateBtn.addEventListener('click', generateFanLetter);
downloadBtn.addEventListener('click', downloadResult);
startOverBtn.addEventListener('click', resetApp);

// --- Initial Setup ---
populateCharacterGrid();
setView('upload');

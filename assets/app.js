const colors = ["#176b87", "#2d9c8f", "#d78c1f", "#7a67a9", "#bd4b4b", "#4d7c48", "#52708f"];
const categoryKeywords = [
  "公共基础课",
  "通识教育课",
  "专业基础课",
  "专业核心课",
  "专业选修课",
  "实践教学",
  "集中实践",
  "创新创业",
  "毕业设计",
  "必修课",
  "选修课"
];

const sampleText = `计算机科学与技术专业本科培养方案
培养目标：培养具备计算思维、工程实践能力和系统设计能力的高素质应用型人才。

课程名称 学分 学期 课程类别
高等数学A 5 第1学期 公共基础课
线性代数 3 第1学期 公共基础课
程序设计基础 4 第1学期 专业基础课
大学英语1 2 第1学期 通识教育课
离散数学 3 第2学期 专业基础课
数据结构 4 第2学期 专业核心课
大学物理 3 第2学期 公共基础课
面向对象程序设计 3 第3学期 专业核心课
计算机组成原理 4 第3学期 专业核心课
数据库系统 3 第4学期 专业核心课
操作系统 4 第4学期 专业核心课
计算机网络 3 第5学期 专业核心课
软件工程 3 第5学期 专业核心课
人工智能导论 2 第6学期 专业选修课
云计算技术 2 第6学期 专业选修课
专业实习 4 第7学期 实践教学
毕业设计 8 第8学期 毕业设计`;

const state = {
  courses: [],
  programName: "",
  confidence: 0,
  imagePreviewUrl: ""
};

const els = {
  planFile: document.querySelector("#planFile"),
  dropzone: document.querySelector("#dropzone"),
  ocrBox: document.querySelector("#ocrBox"),
  imagePreview: document.querySelector("#imagePreview"),
  ocrStatus: document.querySelector("#ocrStatus"),
  ocrProgress: document.querySelector("#ocrProgress"),
  planText: document.querySelector("#planText"),
  loadSample: document.querySelector("#loadSample"),
  heroSample: document.querySelector("#heroSample"),
  clearAll: document.querySelector("#clearAll"),
  analyzeBtn: document.querySelector("#analyzeBtn"),
  fileHint: document.querySelector("#fileHint"),
  programTitle: document.querySelector("#programTitle"),
  exportJson: document.querySelector("#exportJson"),
  courseCount: document.querySelector("#courseCount"),
  creditTotal: document.querySelector("#creditTotal"),
  semesterCount: document.querySelector("#semesterCount"),
  confidenceScore: document.querySelector("#confidenceScore"),
  categoryLabel: document.querySelector("#categoryLabel"),
  creditDonut: document.querySelector("#creditDonut"),
  categoryLegend: document.querySelector("#categoryLegend"),
  semesterLabel: document.querySelector("#semesterLabel"),
  semesterTimeline: document.querySelector("#semesterTimeline"),
  searchCourse: document.querySelector("#searchCourse"),
  categoryFilter: document.querySelector("#categoryFilter"),
  courseTable: document.querySelector("#courseTable")
};

els.loadSample.addEventListener("click", () => {
  loadSamplePlan();
});

els.heroSample.addEventListener("click", () => {
  loadSamplePlan();
  document.querySelector("#workspace").scrollIntoView({ behavior: "smooth", block: "start" });
});

els.clearAll.addEventListener("click", () => {
  els.planFile.value = "";
  els.planText.value = "";
  state.courses = [];
  state.programName = "";
  state.confidence = 0;
  clearImagePreview();
  els.fileHint.textContent = "识别在本地浏览器完成，文件内容不会上传到外部服务。";
  render();
});

els.analyzeBtn.addEventListener("click", analyze);
els.searchCourse.addEventListener("input", renderCourseTable);
els.categoryFilter.addEventListener("change", renderCourseTable);
els.exportJson.addEventListener("click", exportJson);

els.planFile.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    readFile(file);
  }
});

["dragenter", "dragover"].forEach((eventName) => {
  els.dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropzone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  els.dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropzone.classList.remove("dragging");
  });
});

els.dropzone.addEventListener("drop", (event) => {
  const file = event.dataTransfer.files[0];
  if (file) {
    readFile(file);
  }
});

async function readFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (["png", "jpg", "jpeg", "webp", "bmp"].includes(ext) || file.type.startsWith("image/")) {
    await recognizeImage(file);
    return;
  }

  clearImagePreview();

  if (!["txt", "csv", "json", "md"].includes(ext)) {
    els.fileHint.textContent = "当前网站支持文本和图片文件。PDF 或 Word 可先复制正文粘贴到文本框。";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    els.planText.value = String(reader.result || "");
    els.fileHint.textContent = `已读取：${file.name}`;
    analyze();
  };
  reader.readAsText(file, "utf-8");
}

async function recognizeImage(file) {
  if (!window.Tesseract) {
    els.fileHint.textContent = "图片识别组件加载失败，请联网后刷新页面再试。";
    return;
  }

  showImagePreview(file);
  setOcrProgress("正在准备图片识别", 0);
  els.analyzeBtn.disabled = true;
  els.fileHint.textContent = "正在识别图片文字，图片越清晰识别越准确。";

  try {
    const result = await window.Tesseract.recognize(file, "chi_sim+eng", {
      logger: (message) => {
        if (message.status === "recognizing text") {
          setOcrProgress("正在识别图片文字", Math.round((message.progress || 0) * 100));
        } else if (message.status) {
          setOcrProgress(formatOcrStatus(message.status), Math.round((message.progress || 0) * 100));
        }
      }
    });
    const text = cleanOcrText(result.data.text);
    els.planText.value = text;
    setOcrProgress("图片文字识别完成", 100);
    els.fileHint.textContent = text
      ? `已识别：${file.name}，请检查文本后可继续编辑。`
      : "没有从图片中识别到有效文字，请换一张更清晰的截图。";
    analyze();
  } catch (error) {
    setOcrProgress("图片识别失败", 0);
    els.fileHint.textContent = "图片识别失败，请确认图片清晰，或先手动复制文字到文本框。";
  } finally {
    els.analyzeBtn.disabled = false;
  }
}

function showImagePreview(file) {
  clearImagePreview();
  state.imagePreviewUrl = URL.createObjectURL(file);
  els.imagePreview.src = state.imagePreviewUrl;
  els.ocrBox.hidden = false;
}

function clearImagePreview() {
  if (state.imagePreviewUrl) {
    URL.revokeObjectURL(state.imagePreviewUrl);
  }
  state.imagePreviewUrl = "";
  els.imagePreview.removeAttribute("src");
  els.ocrBox.hidden = true;
  setOcrProgress("准备识别图片", 0);
}

function setOcrProgress(status, value) {
  els.ocrStatus.textContent = status;
  els.ocrProgress.value = value;
}

function formatOcrStatus(status) {
  const statusMap = {
    "loading tesseract core": "正在加载识别核心",
    "initializing tesseract": "正在初始化识别引擎",
    "loading language traineddata": "正在加载中文识别模型",
    "initializing api": "正在准备识别接口"
  };
  return statusMap[status] || "正在处理图片";
}

function cleanOcrText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/[|｜]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function loadSamplePlan() {
  els.planText.value = sampleText;
  analyze();
}

function analyze() {
  const raw = els.planText.value.trim();
  if (!raw) {
    state.courses = [];
    state.programName = "";
    state.confidence = 0;
    render();
    return;
  }

  const parsed = parseInput(raw);
  state.courses = parsed.courses;
  state.programName = parsed.programName;
  state.confidence = calculateConfidence(parsed.courses);
  render();
}

function parseInput(raw) {
  const jsonCourses = parseJson(raw);
  if (jsonCourses.length) {
    return {
      courses: normalizeCourses(jsonCourses),
      programName: inferProgramName(raw)
    };
  }

  const csvCourses = parseCsv(raw);
  if (csvCourses.length) {
    return {
      courses: normalizeCourses(csvCourses),
      programName: inferProgramName(raw)
    };
  }

  const lines = raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const courses = lines.map(parseCourseLine).filter(Boolean);

  return {
    courses: normalizeCourses(courses),
    programName: inferProgramName(raw)
  };
}

function parseJson(raw) {
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.courses)) return data.courses;
    if (Array.isArray(data.课程)) return data.课程;
  } catch {
    return [];
  }
  return [];
}

function parseCsv(raw) {
  const rows = raw
    .split(/\n+/)
    .map((line) => splitDelimitedLine(line))
    .filter((row) => row.length >= 2);
  if (rows.length < 2) return [];

  const headers = rows[0].map((cell) => cell.trim());
  const hasHeader = headers.some((cell) => /课程|名称|学分|学期|类别/.test(cell));
  if (!hasHeader) return [];

  return rows.slice(1).map((row) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index] || "";
    });
    return item;
  });
}

function splitDelimitedLine(line) {
  const delimiter = line.includes(",") ? "," : /\t/.test(line) ? "\t" : null;
  if (!delimiter) return [line];
  return line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ""));
}

function parseCourseLine(line) {
  if (!hasCourseSignal(line)) return null;

  const credit = extractCredit(line);
  const semester = extractSemester(line);
  const category = extractCategory(line);
  const name = extractCourseName(line, credit, semester, category);

  if (!name || name.length < 2) return null;

  return {
    name,
    credit,
    semester,
    category,
    note: buildNote(line, credit, semester, category)
  };
}

function hasCourseSignal(line) {
  const ignored = /培养目标|毕业要求|课程名称|学分\s*学期|总学分|说明|要求/.test(line);
  if (ignored) return false;
  return /学分|第?\d+\s*学期|[一二三四五六七八九十]+学期|必修|选修|课程/.test(line);
}

function extractCredit(line) {
  const matched = line.match(/(\d+(?:\.\d+)?)\s*(?:学分|分)/);
  if (matched) return Number(matched[1]);

  const loose = line.match(/(?:^|\s|，|,)(\d+(?:\.\d+)?)(?:\s|，|,)/);
  return loose ? Number(loose[1]) : 0;
}

function extractSemester(line) {
  const digit = line.match(/第?\s*(\d+)\s*学期/);
  if (digit) return Number(digit[1]);

  const cn = line.match(/第?\s*([一二三四五六七八九十]+)\s*学期/);
  if (cn) return chineseNumberToInt(cn[1]);

  return 0;
}

function chineseNumberToInt(value) {
  const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  if (value === "十") return 10;
  if (value.includes("十")) {
    const [left, right] = value.split("十");
    return (map[left] || 1) * 10 + (map[right] || 0);
  }
  return map[value] || 0;
}

function extractCategory(line) {
  const found = categoryKeywords.find((keyword) => line.includes(keyword));
  if (found) return found;
  if (/实验|实训|实习|课程设计/.test(line)) return "实践教学";
  if (/核心/.test(line)) return "专业核心课";
  if (/基础/.test(line)) return "专业基础课";
  if (/选修/.test(line)) return "选修课";
  if (/必修/.test(line)) return "必修课";
  return "未分类";
}

function extractCourseName(line, credit, semester, category) {
  let name = line
    .replace(/^\d+[\.\、]\s*/, "")
    .replace(/(\d+(?:\.\d+)?)\s*(?:学分|分)/g, "")
    .replace(/第?\s*\d+\s*学期/g, "")
    .replace(/第?\s*[一二三四五六七八九十]+\s*学期/g, "")
    .replace(new RegExp(category, "g"), "")
    .replace(/必修|选修|考试|考查|理论|实践|实验/g, "")
    .replace(/[|,，;；:：]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (credit) {
    name = name
      .replace(new RegExp(`(^|\\s)${String(credit).replace(".", "\\.")}(?=\\s|$)`), " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const cells = splitDelimitedLine(line);
  const likelyCell = cells.find((cell) => /[\u4e00-\u9fa5A-Za-z]/.test(cell) && !/学分|学期|必修|选修/.test(cell));
  if (likelyCell && likelyCell.length < name.length) {
    name = likelyCell;
  }

  return name || `未命名课程 ${semester || ""}`.trim();
}

function buildNote(line, credit, semester, category) {
  const missing = [];
  if (!credit) missing.push("缺少学分");
  if (!semester) missing.push("缺少学期");
  if (category === "未分类") missing.push("缺少类别");
  return missing.join("，") || "已识别";
}

function normalizeCourses(courses) {
  return courses
    .map((course, index) => ({
      id: index + 1,
      name: readField(course, ["name", "课程名称", "课程", "名称"]) || `课程 ${index + 1}`,
      credit: Number(readField(course, ["credit", "credits", "学分"]) || 0),
      semester: Number(readField(course, ["semester", "学期", "开课学期"]) || 0),
      category: readField(course, ["category", "类别", "课程类别", "性质"]) || "未分类",
      note: readField(course, ["note", "备注"]) || ""
    }))
    .filter((course) => course.name && course.name.length > 1);
}

function readField(item, keys) {
  for (const key of keys) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== "") {
      return item[key];
    }
  }
  return "";
}

function inferProgramName(raw) {
  const lines = raw.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const matched = lines.find((line) => /专业.*培养方案|培养方案/.test(line));
  if (matched) return matched.slice(0, 32);
  const major = raw.match(/([\u4e00-\u9fa5A-Za-z]+专业)/);
  return major ? `${major[1]}培养方案` : "专业培养方案";
}

function calculateConfidence(courses) {
  if (!courses.length) return 0;
  const score = courses.reduce((sum, course) => {
    let itemScore = 25;
    if (course.credit > 0) itemScore += 25;
    if (course.semester > 0) itemScore += 25;
    if (course.category && course.category !== "未分类") itemScore += 25;
    return sum + itemScore;
  }, 0);
  return Math.round(score / courses.length);
}

function render() {
  const courses = state.courses;
  const totalCredits = sumCredits(courses);
  const semesters = [...new Set(courses.map((course) => course.semester).filter(Boolean))].sort((a, b) => a - b);

  els.programTitle.textContent = state.programName || "等待上传培养方案";
  els.courseCount.textContent = courses.length;
  els.creditTotal.textContent = formatNumber(totalCredits);
  els.semesterCount.textContent = semesters.length ? `${semesters[0]}-${semesters[semesters.length - 1]}` : "0";
  els.confidenceScore.textContent = `${state.confidence}%`;
  els.exportJson.disabled = !courses.length;

  renderDonut(courses);
  renderTimeline(courses);
  renderFilters(courses);
  renderCourseTable();
}

function renderDonut(courses) {
  const groups = groupCreditsBy(courses, "category");
  const entries = Object.entries(groups).filter(([, value]) => value > 0);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  els.creditDonut.innerHTML = "";
  els.categoryLegend.innerHTML = "";

  if (!entries.length || total <= 0) {
    els.categoryLabel.textContent = "暂无数据";
    els.creditDonut.innerHTML = '<circle cx="80" cy="80" r="54" fill="none" stroke="#dce5ea" stroke-width="22" />';
    return;
  }

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  entries.forEach(([category, value], index) => {
    const segment = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    const length = (value / total) * circumference;
    segment.setAttribute("cx", "80");
    segment.setAttribute("cy", "80");
    segment.setAttribute("r", String(radius));
    segment.setAttribute("fill", "none");
    segment.setAttribute("stroke", colors[index % colors.length]);
    segment.setAttribute("stroke-width", "22");
    segment.setAttribute("stroke-dasharray", `${length} ${circumference - length}`);
    segment.setAttribute("stroke-dashoffset", String(-offset));
    segment.setAttribute("transform", "rotate(-90 80 80)");
    els.creditDonut.append(segment);
    offset += length;

    const li = document.createElement("li");
    li.innerHTML = `<span class="swatch" style="background:${colors[index % colors.length]}"></span><span>${category}</span><strong>${formatNumber(value)}</strong>`;
    els.categoryLegend.append(li);
  });

  const center = document.createElementNS("http://www.w3.org/2000/svg", "text");
  center.setAttribute("x", "80");
  center.setAttribute("y", "85");
  center.setAttribute("text-anchor", "middle");
  center.setAttribute("font-size", "20");
  center.setAttribute("font-weight", "700");
  center.setAttribute("fill", "#1d2830");
  center.textContent = formatNumber(total);
  els.creditDonut.append(center);
  els.categoryLabel.textContent = `${entries.length} 类课程`;
}

function renderTimeline(courses) {
  const groups = groupCoursesBySemester(courses);
  const entries = Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b));
  els.semesterTimeline.classList.toggle("empty-state", !entries.length);
  els.semesterTimeline.innerHTML = "";

  if (!entries.length) {
    els.semesterTimeline.textContent = "上传培养方案后，这里会展示每学期课程和学分负荷。";
    els.semesterLabel.textContent = "暂无数据";
    return;
  }

  const maxCredits = Math.max(...entries.map(([, list]) => sumCredits(list)), 1);
  entries.forEach(([semester, list]) => {
    const credits = sumCredits(list);
    const row = document.createElement("div");
    row.className = "semester-row";
    row.innerHTML = `
      <span class="semester-name">第${semester}学期</span>
      <div class="semester-track">
        <div class="semester-fill" style="width:${Math.max(16, (credits / maxCredits) * 100)}%">
          ${list.length} 门课
        </div>
      </div>
      <span class="semester-credit">${formatNumber(credits)} 学分</span>
    `;
    els.semesterTimeline.append(row);
  });

  els.semesterLabel.textContent = `${entries.length} 个学期`;
}

function renderFilters(courses) {
  const current = els.categoryFilter.value;
  const categories = [...new Set(courses.map((course) => course.category).filter(Boolean))].sort();
  els.categoryFilter.innerHTML = '<option value="all">全部类别</option>';
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    els.categoryFilter.append(option);
  });
  els.categoryFilter.value = categories.includes(current) ? current : "all";
}

function renderCourseTable() {
  const keyword = els.searchCourse.value.trim().toLowerCase();
  const category = els.categoryFilter.value;
  const courses = state.courses.filter((course) => {
    const matchKeyword = !keyword || course.name.toLowerCase().includes(keyword);
    const matchCategory = category === "all" || course.category === category;
    return matchKeyword && matchCategory;
  });

  els.courseTable.innerHTML = "";
  if (!courses.length) {
    els.courseTable.innerHTML = '<tr><td colspan="5" class="empty-cell">还没有识别到课程。</td></tr>';
    return;
  }

  courses.forEach((course) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(course.name)}</td>
      <td>${course.credit ? formatNumber(course.credit) : "-"}</td>
      <td>${course.semester ? `第${course.semester}学期` : "-"}</td>
      <td><span class="badge">${escapeHtml(course.category || "未分类")}</span></td>
      <td>${escapeHtml(course.note || "已识别")}</td>
    `;
    els.courseTable.append(row);
  });
}

function groupCreditsBy(courses, key) {
  return courses.reduce((groups, course) => {
    const name = course[key] || "未分类";
    groups[name] = (groups[name] || 0) + (Number(course.credit) || 0);
    return groups;
  }, {});
}

function groupCoursesBySemester(courses) {
  return courses.reduce((groups, course) => {
    if (!course.semester) return groups;
    groups[course.semester] = groups[course.semester] || [];
    groups[course.semester].push(course);
    return groups;
  }, {});
}

function sumCredits(courses) {
  return courses.reduce((sum, course) => sum + (Number(course.credit) || 0), 0);
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function exportJson() {
  const payload = {
    programName: state.programName,
    confidence: state.confidence,
    totalCredits: sumCredits(state.courses),
    courses: state.courses
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${state.programName || "培养方案"}-识别结果.json`;
  link.click();
  URL.revokeObjectURL(url);
}

render();

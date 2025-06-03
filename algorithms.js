const gradePolicies = {
  '1': [
    { min: 97, grade: 'A+', gpa: 4.0 },
    { min: 90, grade: 'A', gpa: 4.0 },
    { min: 85, grade: 'A-', gpa: 3.7 },
    { min: 80, grade: 'B+', gpa: 3.3 },
    { min: 75, grade: 'B', gpa: 3.0 },
    { min: 70, grade: 'B-', gpa: 2.7 },
    { min: 65, grade: 'C+', gpa: 2.3 },
    { min: 60, grade: 'C', gpa: 2.0 },
    { min: 57, grade: 'C-', gpa: 1.7 },
    { min: 55, grade: 'D+', gpa: 1.3 },
    { min: 52, grade: 'D', gpa: 1.0 },
    { min: 50, grade: 'D-', gpa: 0.7 },
    { min: 0, grade: 'F', gpa: 0.0 }
  ]
};

let currentPolicy = gradePolicies['1'];

function setGradingPolicy(val) {
  if (val === 'custom') {
    document.getElementById('custom-boundaries').style.display = 'block';
  } else {
    currentPolicy = gradePolicies[val];
    document.getElementById('custom-boundaries').style.display = 'none';
    calculateCGPA();
  }
}

function applyCustomBoundaries() {
  const text = document.getElementById('custom-boundary-text').value;
  currentPolicy = text.split('\n').map(line => {
    const [min, grade, gpa] = line.split(':');
    return { min: parseFloat(min), grade, gpa: parseFloat(gpa) };
  }).sort((a, b) => b.min - a.min);
  calculateCGPA();
}

function addSemester(data = {}) {
  const container = document.createElement('div');
  container.className = 'semester';
  container.innerHTML = `
    <input placeholder="Semester Name" class="semester-title" value="${data.title || ''}" />
    <div class="courses"></div>
    <button onclick="addCourse(this)">Add Course</button>
    <div class="semester-gpa">GPA: 0.00</div>
  `;
  document.getElementById('semesters').appendChild(container);
  (data.courses || []).forEach(c => addCourse(container.querySelector('button'), c));
}

function addCourse(button, courseData = {}) {
  const coursesDiv = button.parentElement.querySelector('.courses');
  const div = document.createElement('div');
  div.className = 'course-row';
  div.innerHTML = `
    <input placeholder="Course ID" value="${courseData.id || ''}" />
    <input placeholder="Course Name" value="${courseData.name || ''}" />
    <input placeholder="Credit" type="number" value="${courseData.credit || ''}" />
    <input placeholder="Mark" type="number" value="${courseData.mark || ''}" oninput="calculateCGPA()" />
  `;
  coursesDiv.appendChild(div);
  calculateCGPA();
}

function calculateCGPA() {
  let totalQP = 0, totalCredits = 0;
  document.querySelectorAll('.semester').forEach(sem => {
    let semQP = 0, semCredits = 0;
    sem.querySelectorAll('.course-row').forEach(course => {
      const credit = parseFloat(course.children[2].value);
      const mark = parseFloat(course.children[3].value);
      if (!isNaN(credit) && !isNaN(mark)) {
        const entry = currentPolicy.find(p => mark >= p.min);
        if (entry) {
          semQP += credit * entry.gpa;
          semCredits += credit;
        }
      }
    });
    const gpa = semCredits ? (semQP / semCredits).toFixed(2) : '0.00';
    sem.querySelector('.semester-gpa').textContent = `GPA: ${gpa}`;
    totalQP += semQP;
    totalCredits += semCredits;
  });
  const cgpa = totalCredits ? (totalQP / totalCredits).toFixed(2) : '0.00';
  document.getElementById('cgpa-display').textContent = `CGPA: ${cgpa}`;
}

async function handlePDF(event) {
  const file = event.target.files[0];
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const text = await page.getTextContent();
    fullText += text.items.map(item => item.str).join(' ') + '\n';
  }
  parsePDF(fullText);
}

function parsePDF(text) {
  const semesterBlocks = text.split(/SEMESTER:/).slice(1);
  semesterBlocks.forEach(block => {
    const titleMatch = block.match(/([A-Z]+\s\d{4})/);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';
    const courseRegex = /(\b[A-Z]{3}\d{3})\s+([A-Z\s]+?)\s+(\d\.\d{2})\s+[A-F][-+]?\s+(\d\.\d{2})/g;
    const courses = [];
    let match;
    while ((match = courseRegex.exec(block)) !== null) {
      courses.push({
        id: match[1],
        name: match[2].trim(),
        credit: parseFloat(match[3]),
        mark: reverseMapGrade(parseFloat(match[4]))
      });
    }
    addSemester({ title, courses });
  });
}

function reverseMapGrade(gpa) {
  const closest = currentPolicy.reduce((prev, curr) =>
    Math.abs(curr.gpa - gpa) < Math.abs(prev.gpa - gpa) ? curr : prev
  );
  return closest.min;
}

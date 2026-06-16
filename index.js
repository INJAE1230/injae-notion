require('dotenv').config();
const { Client } = require('@notionhq/client');
const readline = require('readline');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID;

let dataSourceId = null;

const PROJECTS = ['내부', '클라이언트', '개인'];
const STATUSES = ['예정', '진행 중', '완료'];
const TAGS = ['회의', '개발', '기획', '리뷰', '버그'];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function getToday() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function getDataSourceId() {
  if (dataSourceId) return dataSourceId;
  const db = await notion.databases.retrieve({ database_id: databaseId });
  dataSourceId = db.data_sources[0].id;
  return dataSourceId;
}

async function addWorkLog() {
  console.log('\n=== 업무일지 추가 ===\n');

  const title = await ask('업무 제목: ');

  console.log('\n프로젝트 선택:');
  PROJECTS.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  const projectIdx = Number(await ask('번호 선택: ')) - 1;
  if (projectIdx < 0 || projectIdx >= PROJECTS.length) {
    console.log('잘못된 번호입니다.');
    return;
  }

  console.log('\n진행상태 선택:');
  STATUSES.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  const statusIdx = Number(await ask('번호 선택 (기본: 1.예정): ') || '1') - 1;
  const status = STATUSES[statusIdx] || '예정';

  console.log('\n태그 선택 (쉼표로 여러개 가능, 예: 1,3):');
  TAGS.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
  const tagInput = await ask('번호 선택 (없으면 엔터): ');
  const selectedTags = tagInput
    ? tagInput.split(',').map(n => TAGS[Number(n.trim()) - 1]).filter(Boolean)
    : [];

  const content = await ask('업무내용: ');

  const hoursInput = await ask('소요시간(시간, 없으면 엔터): ');
  const hours = hoursInput ? Number(hoursInput) : null;

  const link = await ask('관련 링크 (없으면 엔터): ');

  try {
    const properties = {
      '업무': { title: [{ text: { content: title } }] },
      '날짜': { date: { start: getToday() } },
      '프로젝트': { select: { name: PROJECTS[projectIdx] } },
      '진행상태': { status: { name: status } },
      '업무내용': { rich_text: [{ text: { content: content } }] }
    };

    if (selectedTags.length > 0) {
      properties['태그'] = { multi_select: selectedTags.map(t => ({ name: t })) };
    }
    if (hours !== null && !isNaN(hours)) {
      properties['소요시간(시간)'] = { number: hours };
    }
    if (link) {
      properties['관련 링크'] = { url: link };
    }

    await notion.pages.create({
      parent: { database_id: databaseId },
      properties
    });
    console.log('\n업무일지가 추가되었습니다.');
  } catch (err) {
    console.error('\n추가 실패:', err.message);
  }
}

async function listWorkLogs() {
  console.log('\n=== 업무 목록 조회 ===\n');

  console.log('조회 옵션:');
  console.log('  1. 오늘 업무');
  console.log('  2. 전체 업무');
  console.log('  3. 상태별 조회');
  const option = await ask('번호 선택: ');

  let filter = undefined;
  if (option === '1') {
    filter = { property: '날짜', date: { equals: getToday() } };
  } else if (option === '3') {
    console.log('\n진행상태 선택:');
    STATUSES.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    const sIdx = Number(await ask('번호 선택: ')) - 1;
    if (sIdx >= 0 && sIdx < STATUSES.length) {
      filter = { property: '진행상태', status: { equals: STATUSES[sIdx] } };
    }
  }

  try {
    const dsId = await getDataSourceId();
    const query = {
      data_source_id: dsId,
      sorts: [{ property: '날짜', direction: 'descending' }]
    };
    if (filter) query.filter = filter;

    const response = await notion.dataSources.query(query);

    if (response.results.length === 0) {
      console.log('조회된 업무가 없습니다.');
      return;
    }

    console.log(`\n총 ${response.results.length}건\n`);
    console.log('-'.repeat(100));
    console.log(
      '번호'.padEnd(6) + '| ' +
      '업무'.padEnd(22) + '| ' +
      '날짜'.padEnd(14) + '| ' +
      '프로젝트'.padEnd(12) + '| ' +
      '상태'.padEnd(10) + '| ' +
      '태그'
    );
    console.log('-'.repeat(100));

    response.results.forEach((page, i) => {
      const props = page.properties;
      const title = props['업무']?.title?.[0]?.plain_text || '';
      const date = props['날짜']?.date?.start || '';
      const project = props['프로젝트']?.select?.name || '';
      const status = props['진행상태']?.status?.name || '';
      const tags = (props['태그']?.multi_select || []).map(t => t.name).join(', ');

      console.log(
        String(i + 1).padEnd(6) + '| ' +
        title.padEnd(22) + '| ' +
        date.padEnd(14) + '| ' +
        project.padEnd(12) + '| ' +
        status.padEnd(10) + '| ' +
        tags
      );
    });
    console.log('-'.repeat(100));
  } catch (err) {
    console.error('\n조회 실패:', err.message);
  }
}

async function changeStatus() {
  console.log('\n=== 상태 변경 ===\n');

  try {
    const dsId = await getDataSourceId();
    const response = await notion.dataSources.query({
      data_source_id: dsId,
      sorts: [{ property: '날짜', direction: 'descending' }],
      page_size: 20
    });

    if (response.results.length === 0) {
      console.log('업무가 없습니다.');
      return;
    }

    console.log('업무 목록:');
    response.results.forEach((page, i) => {
      const props = page.properties;
      const title = props['업무']?.title?.[0]?.plain_text || '';
      const status = props['진행상태']?.status?.name || '';
      const date = props['날짜']?.date?.start || '';
      console.log(`  ${i + 1}. [${status}] ${title} (${date})`);
    });

    const taskIdx = Number(await ask('\n변경할 업무 번호: ')) - 1;
    if (taskIdx < 0 || taskIdx >= response.results.length) {
      console.log('잘못된 번호입니다.');
      return;
    }

    console.log('\n변경할 상태:');
    STATUSES.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    const statusIdx = Number(await ask('번호 선택: ')) - 1;
    if (statusIdx < 0 || statusIdx >= STATUSES.length) {
      console.log('잘못된 번호입니다.');
      return;
    }

    const pageId = response.results[taskIdx].id;
    await notion.pages.update({
      page_id: pageId,
      properties: {
        '진행상태': { status: { name: STATUSES[statusIdx] } }
      }
    });

    console.log('\n상태가 변경되었습니다.');
  } catch (err) {
    console.error('\n변경 실패:', err.message);
  }
}

async function main() {
  console.log('\n==============================');
  console.log('   노션 업무일지 관리 시스템');
  console.log('==============================\n');

  while (true) {
    console.log('\n메뉴:');
    console.log('  1. 업무일지 추가');
    console.log('  2. 업무 목록 조회');
    console.log('  3. 상태 변경');
    console.log('  0. 종료');

    const choice = await ask('\n선택: ');

    switch (choice) {
      case '1': await addWorkLog(); break;
      case '2': await listWorkLogs(); break;
      case '3': await changeStatus(); break;
      case '0':
        console.log('\n종료합니다.\n');
        rl.close();
        return;
      default:
        console.log('잘못된 입력입니다.');
    }
  }
}

main();

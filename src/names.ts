/** 分区目录名 → 中文分区名。 */
export const ZH_DIVISION: Readonly<Record<string, string>> = {
  engineering: '工程',
  security: '安全',
  testing: '测试',
}

/** 分区目录名 → 英文分区名。 */
export const EN_DIVISION: Readonly<Record<string, string>> = {
  engineering: 'Engineering',
  security: 'Security',
  testing: 'Testing',
}

/** 智能体 slug（文件名去 .md）→ 中文名（现实岗位）。缺省时回退英文 frontmatter name。 */
export const ZH_NAME: Readonly<Record<string, string>> = {
  'engineering-backend-architect': '后端架构师',
  'engineering-backend-architect-storage-cpp': '后端架构师（存储/C++）',
  'engineering-code-reviewer': '代码审查工程师',
  'engineering-data-engineer': '数据工程师',
  'engineering-distributed-file-object-storage-engineer': '分布式存储工程师',
  'engineering-database-optimizer': '数据库性能工程师',
  'engineering-database-reliability-engineer': '数据库可靠性工程师',
  'engineering-incident-response-commander': '故障应急工程师',
  'engineering-software-architect': '软件架构师',
  'engineering-sre': 'SRE（站点可靠性工程师）',
  'engineering-storage-engine-engineer': '存储引擎工程师',
  'engineering-systems-programmer': '系统程序员',
  'security-appsec-engineer': '应用安全工程师',
  'security-architect': '安全架构师',
  'testing-performance-benchmarker': '性能基准测试工程师',
  'testing-performance-benchmarker-systems-cpp': '性能基准工程师（系统/C++）',
}
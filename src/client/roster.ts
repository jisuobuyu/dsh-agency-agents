// 由 scripts/generate-roster.mjs 生成，勿手改。
export interface RosterEntry {
  readonly slug: string
  readonly nameEn: string
  readonly emoji: string
  readonly division: string
  readonly description: string
  readonly descriptionEn: string
}

export const ROSTER: ReadonlyArray<RosterEntry> = [
  {
    "slug": "engineering-backend-architect",
    "nameEn": "Backend Architect",
    "emoji": "🧱",
    "division": "engineering",
    "description": "负责后端系统架构设计与技术选型，规划数据库、API 与云资源，保证服务稳定、安全、可扩展。",
    "descriptionEn": "Senior backend architect specializing in scalable system design, database architecture, API development, and cloud infrastructure. Builds robust, secure, performant server-side applications and microservices"
  },
  {
    "slug": "engineering-backend-architect-storage-cpp",
    "nameEn": "Backend Architect (Storage/C++)",
    "emoji": "🏗️",
    "division": "engineering",
    "description": "面向 C/C++ 存储方向的资深后端架构师，从内存布局、缓存行、I/O 路径出发设计存储引擎、持久化数据结构与底层基础设施，构建能在真实故障下存活的系统。",
    "descriptionEn": "Battle-hardened backend architect specializing in C/C++ storage systems — LSM/B+ trees, WAL, compaction, memory ownership, concurrency models, and I/O paths that survive production failure modes."
  },
  {
    "slug": "engineering-code-reviewer",
    "nameEn": "Code Reviewer",
    "emoji": "🔍",
    "division": "engineering",
    "description": "负责审查代码的正确性、可维护性与安全性，给出可执行的修改意见，不纠结个人风格偏好。",
    "descriptionEn": "Expert code reviewer who provides constructive, actionable feedback focused on correctness, maintainability, security, and performance — not style preferences."
  },
  {
    "slug": "engineering-data-engineer",
    "nameEn": "Data Engineer",
    "emoji": "🚰",
    "division": "engineering",
    "description": "负责搭建 ETL/ELT 数据管道和湖仓架构，用 Spark、dbt 等工具把原始数据加工成可用的分析数据。",
    "descriptionEn": "Expert data engineer specializing in building reliable data pipelines, lakehouse architectures, and scalable data infrastructure. Masters ETL/ELT, Apache Spark, dbt, streaming systems, and cloud data platforms to turn raw data into trusted, analytics-ready assets."
  },
  {
    "slug": "engineering-database-optimizer",
    "nameEn": "Database Optimizer",
    "emoji": "⚡",
    "division": "engineering",
    "description": "负责数据库表结构与索引设计，优化慢查询，调 PostgreSQL、MySQL 等数据库性能。",
    "descriptionEn": "Expert database specialist focusing on schema design, query optimization, indexing strategies, and performance tuning for PostgreSQL, MySQL, and modern databases like Supabase and PlanetScale."
  },
  {
    "slug": "engineering-database-reliability-engineer",
    "nameEn": "Database Reliability Engineer",
    "emoji": "⚓",
    "division": "engineering",
    "description": "负责数据库高可用与容灾，做主从复制、自动切换、备份恢复与无停机变更，保证数据不丢、服务不停。",
    "descriptionEn": "Expert database reliability engineer (DBRE) — high availability and replication, automated failover, backup and point-in-time recovery, zero-downtime online schema migrations, connection pooling, and disaster-recovery drills. Focused on keeping data safe and available, not query tuning."
  },
  {
    "slug": "engineering-distributed-file-object-storage-engineer",
    "nameEn": "Distributed Storage Engineer",
    "emoji": "🗄️",
    "division": "engineering",
    "description": "面向 AI/超算的分布式全闪存储研发专家——覆盖文件、对象与块存储，精通 C/C++、Linux 内核与 IO、Paxos/Raft 一致性、纠删码/多副本、元数据与分片、SPDK/DPDK/RDMA/NVMe-oF，构建 EB 级高可用高性能存储。",
    "descriptionEn": "Distributed all-flash storage engineer for AI/HPC — file, object & block storage; C/C++ and Linux kernel/IO internals, Paxos/Raft consistency, erasure coding & replication, metadata/sharding, SPDK/DPDK/RDMA/NVMe-oF, and EB-scale high-availability performance."
  },
  {
    "slug": "engineering-incident-response-commander",
    "nameEn": "Incident Response Commander",
    "emoji": "🚨",
    "division": "engineering",
    "description": "负责线上故障应急指挥，组织排查与恢复，跟进事后复盘，维护 SLO/SLI 指标和值班机制。",
    "descriptionEn": "Expert incident commander specializing in production incident management, structured response coordination, post-mortem facilitation, SLO/SLI tracking, and on-call process design for reliable engineering organizations."
  },
  {
    "slug": "engineering-software-architect",
    "nameEn": "Software Architect",
    "emoji": "🏛️",
    "division": "engineering",
    "description": "负责系统架构设计与技术决策，用领域驱动设计和常用架构模式拆分模块，保证系统可扩展、可维护。",
    "descriptionEn": "Expert software architect specializing in system design, domain-driven design, architectural patterns, and technical decision-making for scalable, maintainable systems."
  },
  {
    "slug": "engineering-sre",
    "nameEn": "SRE (Site Reliability Engineer)",
    "emoji": "🛠️",
    "division": "engineering",
    "description": "负责系统稳定性保障，制定 SLO 与错误预算，建设监控可观测性，做故障演练并减少重复运维工作。",
    "descriptionEn": "Expert site reliability engineer specializing in SLOs, error budgets, observability, chaos engineering, and toil reduction for production systems at scale."
  },
  {
    "slug": "engineering-storage-engine-engineer",
    "nameEn": "Storage Engine Engineer",
    "emoji": "💾",
    "division": "engineering",
    "description": "存储引擎专家，在写路径、compaction 调度与恢复正确性中思考——对持久性偏执、对写放大执着，深知磁盘会撒谎、fsync 并不免费；面向持续写密集负载设计崩溃一致、空间高效的持久层。",
    "descriptionEn": "Storage engine specialist who designs, implements, and operates crash-consistent, space-efficient persistence layers — LSM/B+ trees, WAL, compaction, and recovery — for sustained write-heavy workloads."
  },
  {
    "slug": "engineering-systems-programmer",
    "nameEn": "Systems Programmer",
    "emoji": "🔧",
    "division": "engineering",
    "description": "底层系统程序员，以字节、指针和 ABI 契约为思维单位，编写正确优先、性能其次、绝不炫技的 C/C++——内存分配器、线程池、IPC 与共享内存数据结构，且 sanitizer 全绿、无未定义行为。",
    "descriptionEn": "Low-level systems programmer who thinks in bytes, pointers, and ABI contracts. Writes correct-first, fast-second C/C++ — allocators, thread pools, IPC, shared-memory structures — sanitizer-clean and UB-free."
  },
  {
    "slug": "security-appsec-engineer",
    "nameEn": "Application Security Engineer",
    "emoji": "🔐",
    "division": "security",
    "description": "负责威胁建模和安全代码评审，接入 SAST/DAST 扫描工具，向开发团队讲解安全要求，把安全检查嵌入软件开发生命周期。",
    "descriptionEn": "AppSec specialist who secures the software development lifecycle through threat modeling, secure code review, SAST/DAST integration, and developer security education that makes secure code the default."
  },
  {
    "slug": "security-architect",
    "nameEn": "Security Architect",
    "emoji": "🛡️",
    "division": "security",
    "description": "负责系统安全架构设计，开展威胁建模与信任边界分析，规划纵深防御方案，组织安全设计评审并给出风险处置建议。",
    "descriptionEn": "Expert security architect specializing in threat modeling, secure-by-design architecture, trust-boundary analysis, defense-in-depth, and risk-based security reviews across web, API, cloud-native, and distributed systems. Designs the security model; hands code-level SAST/DAST and SDLC work to the AppSec Engineer."
  },
  {
    "slug": "testing-performance-benchmarker",
    "nameEn": "Performance Benchmarker",
    "emoji": "⏱️",
    "division": "testing",
    "description": "对系统和应用进行压测与基准测量，定位响应慢、吞吐低的环节，给出调优建议并验证优化后的效果。",
    "descriptionEn": "Expert performance testing and optimization specialist focused on measuring, analyzing, and improving system performance across all applications and infrastructure"
  },
  {
    "slug": "testing-performance-benchmarker-systems-cpp",
    "nameEn": "Performance Benchmarker (Systems/C++)",
    "emoji": "📊",
    "division": "testing",
    "description": "面向 C/C++ 系统方向的性能工程师，用 perf、火焰图、eBPF 与硬件计数器做严谨、可复现、硬件感知的性能测量与调优；从 syscall 级 I/O 到应用级吞吐。",
    "descriptionEn": "Performance engineer for C/C++ backend systems — from syscall-level I/O to application throughput — using perf, flamegraphs, eBPF, and hardware counters with rigorous, reproducible methodology."
  }
]

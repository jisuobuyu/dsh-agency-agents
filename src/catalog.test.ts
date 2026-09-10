import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { ROSTER } from './client/roster.js'
import { parseFrontmatter } from './index.js'
import { ZH_NAME } from './names.js'

const HAN_PATTERN = /\p{Script=Han}/u

function isChineseDominant(text: string): boolean {
  const han = [...text.matchAll(/\p{Script=Han}/gu)].length
  const latin = [...text.matchAll(/[A-Za-z]/g)].length
  return han >= 20 && han / (han + latin) >= 0.2
}

async function readPersona(locale: 'en' | 'zh', division: string, slug: string): Promise<string> {
  const root = locale === 'en' ? '../assets/agency-agents/' : '../assets/agency-agents-zh/'
  const raw = await readFile(new URL(`${root}${division}/${slug}.md`, import.meta.url), 'utf8')
  const parsed = parseFrontmatter(raw)
  if (parsed === undefined || parsed.body === '') throw new Error(`${locale}:${division}/${slug} persona 无效`)
  return parsed.body
}

describe('内置专家名册', () => {
  it('仅保留 16 位分布式存储岗位相关专家', () => {
    const slugs = new Set(ROSTER.map((expert) => expert.slug))
    expect(ROSTER).toHaveLength(16)
    // 岗位核心：C/C++ 系统级、分布式文件/对象存储、性能、可靠性、安全
    expect(slugs.has('engineering-distributed-file-object-storage-engineer')).toBe(true)
    expect(slugs.has('engineering-backend-architect-storage-cpp')).toBe(true)
    expect(slugs.has('engineering-backend-architect')).toBe(true)
    expect(slugs.has('engineering-storage-engine-engineer')).toBe(true)
    expect(slugs.has('engineering-systems-programmer')).toBe(true)
    expect(slugs.has('engineering-software-architect')).toBe(true)
    expect(slugs.has('engineering-sre')).toBe(true)
    expect(slugs.has('engineering-database-reliability-engineer')).toBe(true)
    expect(slugs.has('engineering-code-reviewer')).toBe(true)
    expect(slugs.has('testing-performance-benchmarker-systems-cpp')).toBe(true)
    expect(slugs.has('testing-performance-benchmarker')).toBe(true)
    expect(slugs.has('security-architect')).toBe(true)
    expect(slugs.has('security-appsec-engineer')).toBe(true)
    // 已清理的无关方向专家
    expect(slugs.has('design-ui-designer')).toBe(false)
    expect(slugs.has('specialized-mcp-builder')).toBe(false)
    expect(slugs.has('product-manager')).toBe(false)
    expect(slugs.has('engineering-frontend-developer')).toBe(false)
    expect(slugs.has('engineering-wordpress-shopping-cart')).toBe(false)
    expect(slugs.has('security-penetration-tester')).toBe(false)
    expect(slugs.has('research-synthesist')).toBe(false)
    expect(slugs.has('backend-architect-with-memory')).toBe(false)
  })

  it('中英文调用名称在名册内唯一', () => {
    const chineseNames = ROSTER.map((expert) => ZH_NAME[expert.slug] ?? expert.nameEn)
    const englishNames = ROSTER.map((expert) => expert.nameEn)
    expect(new Set(chineseNames).size).toBe(chineseNames.length)
    expect(new Set(englishNames).size).toBe(englishNames.length)
  })

  it('16 位专家均有纯英文名称、简介和 persona', async () => {
    const invalidNames = ROSTER.filter((expert) => HAN_PATTERN.test(expert.nameEn)).map((expert) => expert.slug)
    const invalidDescriptions = ROSTER
      .filter((expert) => HAN_PATTERN.test(expert.descriptionEn || expert.description))
      .map((expert) => expert.slug)
    const invalidPersonas: string[] = []
    for (const expert of ROSTER) {
      const body = await readPersona('en', expert.division, expert.slug)
      if (HAN_PATTERN.test(body)) invalidPersonas.push(expert.slug)
    }
    expect(invalidNames).toEqual([])
    expect(invalidDescriptions).toEqual([])
    expect(invalidPersonas).toEqual([])
  })

  it('16 位专家均有中文显示名和中文主导 persona', async () => {
    const invalidNames = ROSTER
      .filter((expert) => !HAN_PATTERN.test(ZH_NAME[expert.slug] ?? ''))
      .map((expert) => expert.slug)
    const invalidPersonas: string[] = []
    for (const expert of ROSTER) {
      const body = await readPersona('zh', expert.division, expert.slug).catch(() => '')
      if (!isChineseDominant(body)) invalidPersonas.push(expert.slug)
    }
    expect(invalidNames).toEqual([])
    expect(invalidPersonas).toEqual([])
  })
})

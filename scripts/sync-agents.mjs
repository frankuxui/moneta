import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';

// Read provider-independent sources; never rewrite the canonical instructions.
const skills = (await readdir('.agents/skills', { withFileTypes: true })).filter((entry) =>
  entry.isDirectory(),
);
for (const entry of skills) {
  const content = await readFile(`.agents/skills/${entry.name}/SKILL.md`, 'utf8');
  const frontmatter = content.match(/^---\r?\n([\s\S]+?)\r?\n---/u)?.[1];
  if (
    !frontmatter ||
    !new RegExp(`^name: ${entry.name}$`, 'm').test(frontmatter) ||
    !/^description: .+/m.test(frontmatter)
  ) {
    throw new Error(`Metadatos de skill inválidos: ${entry.name}`);
  }
  await mkdir(`.claude/skills/${entry.name}`, { recursive: true });
  await writeFile(`.claude/skills/${entry.name}/SKILL.md`, content);
}

const profiles = (await readdir('docs/agents')).filter((name) => name.endsWith('.md'));
await mkdir('.claude/agents', { recursive: true });
await mkdir('.codex/agents', { recursive: true });
for (const file of profiles) {
  const name = file.slice(0, -3);
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`Nombre de perfil inválido: ${name}`);
  const content = await readFile(`docs/agents/${file}`, 'utf8');
  const title = content.match(/^# (.+)$/m)?.[1];
  if (!title) throw new Error(`El perfil ${file} necesita un título`);
  await writeFile(
    `.claude/agents/${name}.md`,
    `---\nname: ${name}\ndescription: ${title} especializado para Moneta.\n---\n\nLee AGENTS.md y docs/agents/${name}.md.\n`,
  );
  await writeFile(
    `.codex/agents/${name}.toml`,
    `name = "${name}"\ndescription = "${title} especializado para Moneta"\ndeveloper_instructions = "Lee AGENTS.md y docs/agents/${name}.md y sigue el perfil para la tarea asignada."\n`,
  );
}
console.log(
  `${skills.length} skills y ${profiles.length} perfiles sincronizados desde sus fuentes canónicas.`,
);

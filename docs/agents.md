# Skills y agentes

`AGENTS.md` mantiene las reglas compartidas; `CLAUDE.md` lo importa. Los nueve SKILL.md canónicos están en `.agents/skills`; `pnpm agents:sync` genera copias en `.claude/skills`, sin requerir enlaces simbólicos en Windows. Los siete perfiles neutrales se mantienen en `docs/agents`; el mismo comando genera sus adaptadores. Edita esas fuentes y vuelve a sincronizar. El generador no sobrescribe las instrucciones canónicas.

Codex descubre skills de proyecto en `.agents/skills` y admite perfiles TOML en `.codex/agents` en versiones actuales. Claude Code descubre `.claude/skills` y perfiles Markdown con frontmatter en `.claude/agents`. Son formatos distintos; no se supone compatibilidad entre ellos. Reinicia la sesión o usa el mecanismo de recarga de cada herramienta. Las versiones antiguas pueden no admitir perfiles de proyecto: lee `docs/agents/<perfil>.md` y pide al asistente que siga ese rol directamente. No se modifica la configuración global del usuario.

No hay delegación automática ni modelos forzados. Asigna una tarea delimitada al perfil pertinente; la coordinación y los permisos dependen del asistente y su versión. Comprueba su listado de skills/agentes después de abrir el repositorio. Los archivos se validan como artefactos; su ejecución nativa requiere tener instalado el asistente correspondiente.

Fuentes oficiales consultadas:

- https://learn.chatgpt.com/docs/build-skills
- https://learn.chatgpt.com/docs/agent-configuration/subagents
- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/sub-agents

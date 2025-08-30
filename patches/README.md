Este diret\u00f3rio contém patches aplicados via `patch-package`.

Regras:
- Nunca modifique manualmente os arquivos dentro de `patches/` sem gerar um novo patch.
- Para gerar um patch: altere o node_modules correspondente localmente e rode `npx patch-package <package-name>`.
- Documente o motivo do patch neste arquivo com uma nova entrada abaixo.

Patches existentes:
- (documente aqui por pacote o motivo do patch)

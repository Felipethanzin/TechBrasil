
app.post(
  "/api/auth/register",
  cadastroLimiter,
  upload.single("profilePicture"),
  async (req, res) => {
    const nome = String(req.body.nomeCompleto || "").trim();
    const usuario = String(req.body.nomeUsuario || "").trim().toLowerCase();
    const email = String(req.body.email || "").trim().toLowerCase();
    const senha = String(req.body.senha || "");
    const nascimento = String(req.body.dataNascimento || "").trim();
    const telefone = String(req.body.telefone || "").trim();
    const termos = req.body.termosAceitos;

    let arquivoFoto = req.file?.filename || null;

    try {
      if (!nome || !usuario || !email || !senha || !nascimento) {
        removerArquivo(arquivoFoto);
        return res.status(400).json({
          erro: "Preencha todos os campos obrigatórios."
        });
      }

      if (termos !== "true") {
        removerArquivo(arquivoFoto);
        return res.status(400).json({
          erro: "Você precisa aceitar os Termos de Uso e a Política de Privacidade."
        });
      }

      if (nome.length < 2 || nome.length > 150) {
        removerArquivo(arquivoFoto);
        return res.status(400).json({ erro: "Nome inválido." });
      }

      if (!/^[a-z0-9._]{3,24}$/.test(usuario)) {
        removerArquivo(arquivoFoto);
        return res.status(400).json({
          erro: "O usuário deve ter entre 3 e 24 caracteres."
        });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        removerArquivo(arquivoFoto);
        return res.status(400).json({ erro: "E-mail inválido." });
      }

      if (senha.length < 10 || Buffer.byteLength(senha, "utf8") > 72) {
        removerArquivo(arquivoFoto);
        return res.status(400).json({
          erro: "A senha deve ter pelo menos 10 caracteres."
        });
      }

      const dataNascimento = new Date(`${nascimento}T00:00:00.000Z`);

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(nascimento) ||
        Number.isNaN(dataNascimento.getTime()) ||
        dataNascimento.toISOString().slice(0, 10) !== nascimento ||
        nascimento < "1900-01-01" ||
        dataNascimento > new Date()
      ) {
        removerArquivo(arquivoFoto);
        return res.status(400).json({
          erro: "Informe uma data de nascimento válida."
        });
      }

      let idade = new Date().getUTCFullYear() - dataNascimento.getUTCFullYear();
      const hoje = new Date();

      if (
        hoje.getUTCMonth() < dataNascimento.getUTCMonth() ||
        (
          hoje.getUTCMonth() === dataNascimento.getUTCMonth() &&
          hoje.getUTCDate() < dataNascimento.getUTCDate()
        )
      ) {
        idade--;
      }

      if (idade < 13) {
        removerArquivo(arquivoFoto);
        return res.status(400).json({
          erro: "É necessário ter pelo menos 13 anos para criar uma conta."
        });
      }

      if (telefone.length > 30) {
        removerArquivo(arquivoFoto);
        return res.status(400).json({ erro: "Telefone inválido." });
      }

      const existente = await pool.query(
        `SELECT 1
         FROM public.usuarios
         WHERE excluido_em IS NULL
           AND (LOWER(email) = $1 OR LOWER(nome_usuario) = $2)
         LIMIT 1`,
        [email, usuario]
      );

      if (existente.rowCount > 0) {
        removerArquivo(arquivoFoto);
        return res.status(409).json({
          erro: "Este e-mail ou nome de usuário já está cadastrado."
        });
      }

      const senhaHash = await bcrypt.hash(senha, 12);
      const fotoPerfil = arquivoFoto
        ? `/uploads/avatars/${arquivoFoto}`
        : null;

      const resultado = await pool.query(
        `INSERT INTO public.usuarios (
          nome_completo,
          nome_usuario,
          email,
          senha_hash,
          data_nascimento,
          telefone,
          foto_perfil
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, nome_completo, nome_usuario, email, criado_em`,
        [
          nome,
          usuario,
          email,
          senhaHash,
          nascimento,
          telefone || null,
          fotoPerfil
        ]
      );

      return res.status(201).json({
        mensagem: "Conta criada com sucesso!",
        usuario: resultado.rows[0],
        redirect: "/login/login.html"
      });
    } catch (error) {
      removerArquivo(arquivoFoto);
      console.error("Erro ao criar conta:", error);

      if (error.code === "23505") {
        return res.status(409).json({
          erro: "Este e-mail ou nome de usuário já está cadastrado."
        });
      }

      return res.status(500).json({
        erro: "Não foi possível criar sua conta. Verifique o servidor."
      });
    }
  }
);

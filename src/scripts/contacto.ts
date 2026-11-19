/**
 * Formulario de contacto (prototipo): valida y muestra un aviso. No envía ni guarda nada (sin fetch, sin almacenamiento).
 */
const form = document.getElementById('form-contacto') as HTMLFormElement | null
const estado = document.getElementById('estado-envio')

type Campo = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

const mensajeDe = (c: Campo): string => {
  const v = c.validity
  switch (c.name) {
    case 'nombre': return v.valueMissing ? 'Escribe tu nombre.' : ''
    case 'email': return v.valueMissing ? 'Escribe tu correo electrónico.' : v.typeMismatch ? 'Revisa el formato del correo, por ejemplo nombre@dominio.cl.' : ''
    case 'tipo': return v.valueMissing ? 'Elige un tipo de consulta.' : ''
    case 'mensaje': return v.valueMissing ? 'Escribe tu consulta.' : c.value.trim().length < 10 ? 'Cuéntanos un poco más (al menos 10 caracteres).' : ''
    case 'consentimiento': return v.valueMissing ? 'Debes aceptar para poder enviar tu consulta.' : ''
    default: return ''
  }
}

const marcar = (c: Campo): boolean => {
  const texto = mensajeDe(c)
  const err = document.getElementById(`err-${c.name}`)
  c.setAttribute('aria-invalid', texto ? 'true' : 'false')
  if (err) {
    err.textContent = texto
    err.classList.toggle('hidden', !texto)
  }
  return !texto
}

if (form) {
  const campos = ['nombre', 'email', 'tipo', 'mensaje', 'consentimiento'].map((n) => form.elements.namedItem(n) as Campo)
  const boton = form.querySelector<HTMLButtonElement>('button[type=submit]')
  if (boton) boton.disabled = false

  const tipo = new URLSearchParams(location.search).get('tipo')
  const sel = form.elements.namedItem('tipo')
  if (tipo && sel instanceof HTMLSelectElement && [...sel.options].some((o) => o.value === tipo)) sel.value = tipo

  for (const c of campos) {
    c.addEventListener('blur', () => c.value !== '' && marcar(c))
    c.addEventListener('input', () => c.getAttribute('aria-invalid') === 'true' && marcar(c))
    c.addEventListener('change', () => c.getAttribute('aria-invalid') === 'true' && marcar(c))
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const invalidos = campos.filter((c) => !marcar(c))
    if (invalidos.length) {
      invalidos[0].focus()
      return
    }
    form.reset()
    if (estado) {
      estado.textContent = 'Mensaje de prueba: este prototipo no envía datos. Cuando el sitio esté en producción, tu consulta llegará al equipo del programa.'
      estado.classList.remove('hidden')
      estado.focus()
    }
  })
}

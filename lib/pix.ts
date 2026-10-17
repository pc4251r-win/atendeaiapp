function field(id: string, value: string) {
  const len = value.length.toString().padStart(2, '0')
  return `${id}${len}${value}`
}

function crc16(payload: string) {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function clean(text: string, max: number) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toUpperCase()
    .slice(0, max)
}

export function gerarPixCopiaECola(params: {
  chave: string
  nome: string
  cidade: string
  valor: number
  txid?: string
}) {
  const gui = field('00', 'br.gov.bcb.pix') + field('01', params.chave || 'atendeai@pix.com.br')
  const txid = (params.txid || '***').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***'
  let payload =
    field('00', '01') +
    field('26', gui) +
    field('52', '0000') +
    field('53', '986') +
    field('54', params.valor.toFixed(2)) +
    field('58', 'BR') +
    field('59', clean(params.nome || 'ATENDEAI', 25) || 'ATENDEAI') +
    field('60', clean(params.cidade || 'SAO PAULO', 15) || 'SAO PAULO') +
    field('62', field('05', txid))
  payload += '6304'
  return payload + crc16(payload)
}

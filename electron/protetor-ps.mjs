// Scripts do Windows PowerShell 5.1 que ligam e desligam o protetor de tela do
// usuario atual (HKCU, sem administrador): grava o caminho do .scr e avisa o
// Windows pela SystemParametersInfo (tempo, ativo e "ao reiniciar, exibir a
// tela de logon"). Caminho e minutos chegam como parametros.
const BASE = String.raw`$ErrorActionPreference = 'Stop'
Add-Type -Namespace Terrario -Name Spi -MemberDefinition '[DllImport("user32.dll", SetLastError = true)] public static extern bool SystemParametersInfo(uint acao, uint valor, System.IntPtr p, uint ini);'
function Spi([uint32]$acao, [uint32]$valor) {
  # SPIF_UPDATEINIFILE | SPIF_SENDCHANGE
  if (-not [Terrario.Spi]::SystemParametersInfo($acao, $valor, [System.IntPtr]::Zero, 3)) { throw "SystemParametersInfo $acao falhou" }
}
$chave = 'HKCU:\Control Panel\Desktop'
`;

export const SCRIPT_LIGAR_PROTETOR = String.raw`param([Parameter(Mandatory = $true)][string]$Scr, [Parameter(Mandatory = $true)][int]$Minutos)
` + BASE + String.raw`if (-not (Test-Path -LiteralPath $Scr)) { throw 'Protetor nao encontrado.' }
Set-ItemProperty -Path $chave -Name 'SCRNSAVE.EXE' -Value $Scr
Spi 0x000F ($Minutos * 60)  # SPI_SETSCREENSAVETIMEOUT
Spi 0x0077 1                # SPI_SETSCREENSAVESECURE: pede a senha ao sair
Spi 0x0011 1                # SPI_SETSCREENSAVEACTIVE
$lido = (Get-ItemProperty -Path $chave).'SCRNSAVE.EXE'
if ($lido -ne $Scr) { throw 'Uma politica do Windows nao deixou trocar o protetor de tela.' }
Write-Output 'ok'
`;

export const SCRIPT_DESLIGAR_PROTETOR = String.raw`param([string]$Scr = '')
` + BASE + String.raw`Spi 0x0011 0                # SPI_SETSCREENSAVEACTIVE
$atual = (Get-ItemProperty -Path $chave -ErrorAction SilentlyContinue).'SCRNSAVE.EXE'
# so apaga o caminho se ainda for o nosso
if ($Scr -and $atual -eq $Scr) { Remove-ItemProperty -Path $chave -Name 'SCRNSAVE.EXE' }
Write-Output 'ok'
`;

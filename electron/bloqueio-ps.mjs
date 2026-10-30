// Script do Windows PowerShell 5.1 que troca a imagem da tela de bloqueio do
// usuario atual pela API do Windows (Windows.System.UserProfile.LockScreen).
// Nao pede administrador. O caminho da imagem chega como parametro.
export const SCRIPT_BLOQUEIO = String.raw`param([Parameter(Mandatory = $true)][string]$Imagem)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.System.UserProfile.LockScreen, Windows.System.UserProfile, ContentType = WindowsRuntime]
$metodos = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 }
$comResultado = $metodos | Where-Object { $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation${'`'}1' } | Select-Object -First 1
$semResultado = $metodos | Where-Object { $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' } | Select-Object -First 1
$t = $comResultado.MakeGenericMethod([Windows.Storage.StorageFile]).Invoke($null, @([Windows.Storage.StorageFile]::GetFileFromPathAsync($Imagem)))
if (-not $t.Wait(15000)) { throw 'Tempo esgotado ao abrir a imagem.' }
$t2 = $semResultado.Invoke($null, @([Windows.System.UserProfile.LockScreen]::SetImageFileAsync($t.Result)))
if (-not $t2.Wait(15000)) { throw 'Tempo esgotado ao trocar a tela de bloqueio.' }
Write-Output 'ok'
`;

# Live money-loop smoke — AmplifiedTraders
#
# Proves the money path end to end against a RUNNING deployment (not a dev
# database): member registers -> deposits -> operator confirms -> wallet credited
# -> member withdraws -> operator rejects -> hold refunded.
#
# Usage:
#   $env:AT_ADMIN_PASSWORD = '<admin password>'
#   $env:AT_BASE_URL      = 'https://amplifiedtraders.com'   # optional
#   powershell -File tools/smoke/live-money-loop.ps1
#
# The admin password is read from the environment and is NEVER stored here.
# This script creates one clearly-labelled test member and leaves its ledger
# rows in place — a financial ledger is not something to delete from. To find
# it later: the member's email contains "smoke.moneyloop".
#
# Bodies travel in files, never as command arguments (Windows strips the
# embedded double quotes out of a native command's argv, which turns valid
# JSON into a 400 that looks like an auth failure).

$ErrorActionPreference = 'Stop'
$BaseUrl = if ($env:AT_BASE_URL) { $env:AT_BASE_URL.TrimEnd('/') } else { 'https://amplifiedtraders.com' }
$AdminPassword = $env:AT_ADMIN_PASSWORD
if (-not $AdminPassword) { throw 'Set $env:AT_ADMIN_PASSWORD first.' }

$Script:Pass = 0
$Script:Fail = 0
$Script:Checks = @()

function Check([string]$Name, [bool]$Ok, [string]$Detail = '') {
  $Script:Checks += $Name
  if ($Ok) { $Script:Pass++; Write-Host ("  PASS  {0}  {1}" -f $Name, $Detail) -ForegroundColor Green }
  else { $Script:Fail++; Write-Host ("  FAIL  {0}  {1}" -f $Name, $Detail) -ForegroundColor Red }
}

$tmp = [IO.Path]::GetTempPath()
$Stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$MemberEmail = "smoke.moneyloop.$Stamp@amplifiedtraders.invalid"
$MemberPassword = 'SmokeLap-2026x'
$MemberName = 'Smoke Test Money Loop'

function Body([string]$Name, [hashtable]$Payload) {
  $path = Join-Path $tmp "at-smoke-$Name.json"
  [IO.File]::WriteAllText($path, ($Payload | ConvertTo-Json -Compress))
  return $path
}

function Post([string]$Path, [string]$BodyFile, [string]$Jar, [string]$Method = 'POST') {
  $args = @('-s', '-m', '30', '-w', "`n%{http_code}", '--data-binary', "@$BodyFile")
  if ($Jar) { $args += @('-b', $Jar, '-c', $Jar) }
  $args += @('-X', $Method, "$BaseUrl$Path")
  $out = & curl.exe @args
  $code = ($out | Select-Object -Last 1)
  $body = ($out | Select-Object -SkipLast 1) -join "`n"
  return [pscustomobject]@{ Code = $code; Body = $body }
}

function Get([string]$Path, [string]$Jar) {
  $args = @('-s', '-m', '30', '-w', "`n%{http_code}")
  if ($Jar) { $args += @('-b', $Jar) }
  $args += "$BaseUrl$Path"
  $out = & curl.exe @args
  $code = ($out | Select-Object -Last 1)
  $body = ($out | Select-Object -SkipLast 1) -join "`n"
  return [pscustomobject]@{ Code = $code; Body = $body }
}

$memberJar = Join-Path $tmp 'at-smoke-member.jar'
$adminJar  = Join-Path $tmp 'at-smoke-admin.jar'
Remove-Item $memberJar, $adminJar -ErrorAction SilentlyContinue

Write-Host "Live money-loop smoke against $BaseUrl" -ForegroundColor Cyan
Write-Host "member: $MemberEmail`n" -ForegroundColor DarkGray

# ── 1. register ────────────────────────────────────────────────────────────
$r = Post '/api/auth/register' (Body 'register' @{ fullName = $MemberName; email = $MemberEmail; password = $MemberPassword }) $null
Check 'register member' ($r.Code -eq '201' -or $r.Code -eq '200') "HTTP $($r.Code) $($r.Body.Substring(0,[Math]::Min(120,$r.Body.Length)))"

# ── 2. member signs in ─────────────────────────────────────────────────────
$r = Post '/api/auth/login' (Body 'login' @{ email = $MemberEmail; password = $MemberPassword }) $memberJar
Check 'member login' ($r.Code -eq '200') "HTTP $($r.Code)"

# ── 3. member files a deposit ──────────────────────────────────────────────
$r = Post '/api/wallet/deposits' (Body 'deposit' @{ amount = '100.00'; method = 'CRYPTO'; reference = "SMOKE-$Stamp" }) $memberJar
$deposit = $null
try { $deposit = $r.Body | ConvertFrom-Json } catch {}
Check 'create deposit' ($r.Code -eq '201' -and $deposit -and $deposit.id) "HTTP $($r.Code) id=$($deposit.id) gross=$($deposit.grossCents) fee=$($deposit.feeCents) rail=$($deposit.railAmount) $($deposit.railCurrency)"
# Fee-on-top: the member names the NET (100.00 = 10000c); the gross they must
# send is net + fee, and the wallet is credited the net only.
Check 'deposit is fee-on-top' ($deposit -and ($deposit.grossCents - $deposit.feeCents) -eq 10000 -and $deposit.railCurrency -eq 'USDT') "gross=$($deposit.grossCents) fee=$($deposit.feeCents) net=$($deposit.grossCents - $deposit.feeCents) rail=$($deposit.railCurrency)"

# ── 4. operator signs in ───────────────────────────────────────────────────
$r = Post '/api/admin/auth/login' (Body 'adminlogin' @{ email = 'admin@amplifiedtraders.com'; password = $AdminPassword }) $adminJar
Check 'admin login' ($r.Code -eq '200') "HTTP $($r.Code)"

# ── 5. operator confirms the deposit ───────────────────────────────────────
$r = Post "/api/admin/deposits/$($deposit.id)" (Body 'confirm' @{ action = 'confirm' }) $adminJar 'PATCH'
$conf = $null; try { $conf = $r.Body | ConvertFrom-Json } catch {}
Check 'admin confirms deposit' ($r.Code -eq '200' -and $conf.ok -and $conf.status -eq 'PAID') "HTTP $($r.Code) status=$($conf.status) (PaymentStatus has no CONFIRMED; PAID is the terminal success state)"

# ── 6. the wallet is credited with the NET amount ──────────────────────────
$w = Get '/dashboard/wallet' $memberJar
Check 'wallet page renders' ($w.Code -eq '200') "HTTP $($w.Code)"
Check 'balance credited = $100.00' ($w.Body -like '*$100.00*') "expected `$100.00 in the rendered balance"

# ── 7. member requests a withdrawal (held immediately) ─────────────────────
$r = Post '/api/wallet/withdrawals' (Body 'withdraw' @{ amount = '50.00'; method = 'BANK_TRANSFER'; destination = 'SMOKE TEST - not a real account' }) $memberJar
$payout = $null; try { $payout = $r.Body | ConvertFrom-Json } catch {}
Check 'create withdrawal' ($r.Code -eq '201' -and $payout.id) "HTTP $($r.Code) id=$($payout.id)"

$w = Get '/dashboard/wallet' $memberJar
Check 'balance held = $50.00' ($w.Body -like '*$50.00*') "the $50 is held at request time"

# ── 8. operator rejects it — the hold must come back ───────────────────────
$r = Post "/api/admin/payouts/$($payout.id)" (Body 'reject' @{ action = 'reject'; reason = 'Smoke test - releasing the hold' }) $adminJar 'PATCH'
$dec = $null; try { $dec = $r.Body | ConvertFrom-Json } catch {}
Check 'admin rejects withdrawal' ($r.Code -eq '200' -and $dec.ok) "HTTP $($r.Code) status=$($dec.status)"

$w = Get '/dashboard/wallet' $memberJar
Check 'balance refunded = $100.00' ($w.Body -like '*$100.00*') "the hold was refunded in full"

# ── 9. the ledger shows both movements ─────────────────────────────────────
$t = Get '/dashboard/transactions' $memberJar
Check 'transactions page renders' ($t.Code -eq '200') "HTTP $($t.Code)"
Check 'ledger shows the deposit'  ($t.Body -like '*Deposit*') "a DEPOSIT ledger entry is listed"
Check 'ledger shows the withdrawal' ($t.Body -like '*Withdrawal*') "a WITHDRAWAL ledger entry is listed"

# ── 10. the member area is actually guarded ────────────────────────────────
$anon = Get '/dashboard/wallet' $null
Check 'wallet needs a session' ($anon.Code -eq '307' -or $anon.Code -eq '302' -or $anon.Code -eq '401') "unauthenticated HTTP $($anon.Code)"

# ── completeness guard (a harness that exits 0 after aborting is a lie) ────
$EXPECTED = 13
$ran = $Script:Pass + $Script:Fail
Check 'suite completeness' ($ran -ge $EXPECTED) "ran=$ran expected>=$EXPECTED"

Write-Host ""
Write-Host ("==== LIVE MONEY-LOOP SMOKE: {0} passed, {1} failed ====" -f $Script:Pass, $Script:Fail) -ForegroundColor Cyan
Write-Host "member left behind: $MemberEmail" -ForegroundColor DarkGray
if ($Script:Fail -gt 0) { exit 1 }

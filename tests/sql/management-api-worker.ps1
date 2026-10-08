# Approved 8514bec/101f788 transport. Credential remains in this worker only.
# Input/output pipes carry prepared SQL and receipts, never the credential.
param([switch]$FakeCredential)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$privateToken = $null
$client = $null
try {
    if ($FakeCredential) { $privateToken = 'sbp_' + ('a' * 40) }
    else {
        Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class SkyGuideCredentialRead {
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
 struct Credential { public uint Flags, Type; public string TargetName, Comment;
 public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
 public uint CredentialBlobSize; public IntPtr CredentialBlob;
 public uint Persist, AttributeCount; public IntPtr Attributes; public string TargetAlias, UserName; }
 [DllImport("advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
 static extern bool CredRead(string target, uint type, uint flags, out IntPtr pointer);
 [DllImport("advapi32.dll")] static extern void CredFree(IntPtr pointer);
 public static string Read(string target) {
   IntPtr pointer;
   if (!CredRead(target, 1, 0, out pointer)) return null;
   byte[] bytes = null;
   try { var value = Marshal.PtrToStructure<Credential>(pointer);
     bytes = new byte[value.CredentialBlobSize];
     Marshal.Copy(value.CredentialBlob, bytes, 0, bytes.Length);
     return Encoding.UTF8.GetString(bytes).Trim();
   } finally { if (bytes != null) Array.Clear(bytes, 0, bytes.Length); CredFree(pointer); }
 }
}
'@
        foreach ($target in @('Supabase CLI:supabase', 'Supabase CLI:access-token')) {
            $privateToken = [SkyGuideCredentialRead]::Read($target)
            if ($privateToken) { break }
        }
        if (!$privateToken) {
            $existingHome = if ($env:SUPABASE_HOME) { $env:SUPABASE_HOME } else { Join-Path $env:USERPROFILE '.supabase' }
            $existingPath = Join-Path $existingHome 'access-token'
            if (Test-Path -LiteralPath $existingPath -PathType Leaf) {
                $privateToken = [IO.File]::ReadAllText($existingPath).Trim()
            }
        }
    }
    if ($privateToken -notmatch '^sbp_[a-f0-9]{40}$') { throw 'Credential unavailable' }
    $handler = [Net.Http.HttpClientHandler]::new()
    $handler.AllowAutoRedirect = $false
    $client = [Net.Http.HttpClient]::new($handler)
    $client.Timeout = [TimeSpan]::FromSeconds(65)
    $client.DefaultRequestHeaders.Authorization = [Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $privateToken)
    [Console]::Out.WriteLine('{"ready":true}')
    while ($null -ne ($line = [Console]::In.ReadLine())) {
        $request = $null
        $response = $null
        try {
            $inputRequest = $line | ConvertFrom-Json
            $base = 'https://api.supabase.com/v1/projects/tpbydviuknovimroeodm'
            switch -Exact ($inputRequest.operation) {
                'project' { $method = 'GET'; $url = $base; $payload = $null }
                'query' { $method = 'POST'; $url = $base + '/database/query'; $payload = @{ query = [string]$inputRequest.query } | ConvertTo-Json -Compress }
                'cleanup' {
                    if ($inputRequest.authority -cne '8514bec+101f788-direct-user-approval') { throw 'Missing cleanup authority' }
                    $method = 'DELETE'; $url = $base + '/cli/login-role'; $payload = $null
                }
                default { throw 'Operation outside approved transport' }
            }
            if ($FakeCredential) {
                [Console]::Out.WriteLine((@{status=200; fake=$true; method=$method; url=$url; body='[]'} | ConvertTo-Json -Compress))
                continue
            }
            $request = [Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::new($method), $url)
            if ($payload) { $request.Content = [Net.Http.StringContent]::new($payload, [Text.Encoding]::UTF8, 'application/json') }
            $response = $client.SendAsync($request).GetAwaiter().GetResult()
            $body = if ($inputRequest.operation -eq 'cleanup') { '' } else { $response.Content.ReadAsStringAsync().GetAwaiter().GetResult() }
            # Defense against reflected credentials: no credential bytes ever enter receipts.
            if ($body.Contains($privateToken)) { throw 'Credential reflection rejected' }
            if ($inputRequest.operation -eq 'project' -and $response.IsSuccessStatusCode) {
                $project = $body | ConvertFrom-Json
                $body = @{id=$project.id; name=$project.name; organization_id=$project.organization_id; region=$project.region; status=$project.status} | ConvertTo-Json -Compress
            }
            [Console]::Out.WriteLine((@{status=[int]$response.StatusCode; body=$body} | ConvertTo-Json -Compress -Depth 10))
        } catch { [Console]::Out.WriteLine('{"error":"Transport operation failed; sensitive exception omitted"}') }
        finally { if ($response) { $response.Dispose() }; if ($request) { $request.Dispose() } }
    }
} catch { [Console]::Out.WriteLine('{"error":"Worker initialization failed; sensitive exception omitted"}') }
finally {
    if ($client) { $client.DefaultRequestHeaders.Authorization = $null; $client.Dispose() }
    $privateToken = $null
}

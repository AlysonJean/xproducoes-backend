# Test Render deploy via API
# Usage: .\test-render-deploy.ps1 -apiKey <your-key> -serviceId <service-id>

param(
    [Parameter(Mandatory=$true)]
    [string]$apiKey,
    
    [Parameter(Mandatory=$true)]
    [string]$serviceId
)

Write-Host "Testing Render deploy..." -ForegroundColor Cyan
Write-Host "Service ID: $serviceId" -ForegroundColor Yellow
Write-Host "API Key: $($apiKey.Substring(0,8))..." -ForegroundColor Yellow

$url = "https://api.render.com/v1/services/$serviceId/deploys"
$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}
$body = "{}"

Write-Host "`nSending deploy trigger to Render API..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $body -UseBasicParsing
    
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
        Write-Host "`n✅ Deploy triggered successfully!" -ForegroundColor Green
        Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "`nResponse:" -ForegroundColor Cyan
        $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
        
        Write-Host "`nCheck deploy status at: https://dashboard.render.com/web/$serviceId" -ForegroundColor Cyan
        exit 0
    } else {
        Write-Host "`n❌ Deploy failed with status: $($response.StatusCode)" -ForegroundColor Red
        Write-Host $response.Content
        exit 1
    }
} catch {
    Write-Host "`n❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
    
    exit 1
}

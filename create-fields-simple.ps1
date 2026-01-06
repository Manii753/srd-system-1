# Simple PowerShell script to create sample fields
$baseUrl = "http://localhost:3000"

function Create-Field {
    param(
        [string]$Name,
        [string]$Type,
        [string]$Department,
        [string]$Placeholder = "",
        [bool]$IsRequired = $false,
        [int]$Order = 0,
        [string]$ParentHeadingId = ""
    )
    
    $body = @{
        name = $Name
        type = $Type
        department = $Department
        placeholder = $Placeholder
        isRequired = $IsRequired
        order = $Order
        active = $true
    }
    
    if ($ParentHeadingId -ne "") {
        $body.parentHeading = $ParentHeadingId
    }
    
    $jsonBody = $body | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/newField" -Method POST -Body $jsonBody -ContentType "application/json"
        Write-Host "✓ Created: $Name" -ForegroundColor Green
        return $response._id
    }
    catch {
        Write-Host "✗ Failed to create: $Name" -ForegroundColor Red
        return $null
    }
}

Write-Host "Creating sample fields..." -ForegroundColor Cyan

# VMD Department Fields
Write-Host "Creating VMD fields..." -ForegroundColor Yellow
$vmdBasicInfo = Create-Field -Name "Basic Information" -Type "heading" -Department "vmd" -Order 0
Create-Field -Name "Brand" -Type "text" -Department "vmd" -Placeholder "e.g., Fashion Co." -IsRequired $true -Order 1 -ParentHeadingId $vmdBasicInfo
Create-Field -Name "Sample Type" -Type "text" -Department "vmd" -Placeholder "Proto, SMS, PP" -IsRequired $true -Order 2 -ParentHeadingId $vmdBasicInfo
Create-Field -Name "Style Code" -Type "text" -Department "vmd" -Placeholder "e.g., FC-2025-001" -IsRequired $true -Order 3 -ParentHeadingId $vmdBasicInfo

$vmdSampleDetails = Create-Field -Name "Sample Details" -Type "heading" -Department "vmd" -Order 4
Create-Field -Name "Size" -Type "text" -Department "vmd" -Placeholder "S, M, L, XL" -IsRequired $true -Order 5 -ParentHeadingId $vmdSampleDetails
Create-Field -Name "Quantity" -Type "number" -Department "vmd" -Placeholder "Number of pieces" -IsRequired $true -Order 6 -ParentHeadingId $vmdSampleDetails
Create-Field -Name "Color" -Type "text" -Department "vmd" -Placeholder "Medium Blue, Black" -IsRequired $true -Order 7 -ParentHeadingId $vmdSampleDetails

$vmdTimeline = Create-Field -Name "Timeline" -Type "heading" -Department "vmd" -Order 8
Create-Field -Name "Sample Raise Date" -Type "date" -Department "vmd" -IsRequired $true -Order 9 -ParentHeadingId $vmdTimeline
Create-Field -Name "Expected Delivery Date" -Type "date" -Department "vmd" -IsRequired $true -Order 10 -ParentHeadingId $vmdTimeline

# CAD Department Fields
Write-Host "Creating CAD fields..." -ForegroundColor Yellow
$cadTechSpecs = Create-Field -Name "Technical Specifications" -Type "heading" -Department "cad" -Order 0
Create-Field -Name "Pattern Number" -Type "text" -Department "cad" -Placeholder "PAT-2025-001" -IsRequired $true -Order 1 -ParentHeadingId $cadTechSpecs
Create-Field -Name "Fit Type" -Type "text" -Department "cad" -Placeholder "Slim, Regular, Relaxed" -IsRequired $true -Order 2 -ParentHeadingId $cadTechSpecs
Create-Field -Name "Size Range" -Type "text" -Department "cad" -Placeholder "28-38, S-XXL" -IsRequired $true -Order 3 -ParentHeadingId $cadTechSpecs

$cadMeasurements = Create-Field -Name "Key Measurements" -Type "heading" -Department "cad" -Order 4
Create-Field -Name "Waist (inches)" -Type "number" -Department "cad" -Placeholder "Waist measurement" -Order 5 -ParentHeadingId $cadMeasurements
Create-Field -Name "Hip (inches)" -Type "number" -Department "cad" -Placeholder "Hip measurement" -Order 6 -ParentHeadingId $cadMeasurements
Create-Field -Name "Inseam (inches)" -Type "number" -Department "cad" -Placeholder "Inseam length" -Order 7 -ParentHeadingId $cadMeasurements

# Commercial Department Fields
Write-Host "Creating Commercial fields..." -ForegroundColor Yellow
$commBusiness = Create-Field -Name "Business Information" -Type "heading" -Department "commercial" -Order 0
Create-Field -Name "Customer" -Type "text" -Department "commercial" -Placeholder "Customer name" -IsRequired $true -Order 1 -ParentHeadingId $commBusiness
Create-Field -Name "Inquiry Number" -Type "text" -Department "commercial" -Placeholder "INQ-2025-001" -IsRequired $true -Order 2 -ParentHeadingId $commBusiness
Create-Field -Name "Inquiry Status" -Type "text" -Department "commercial" -Placeholder "New, Under Review, Quoted" -IsRequired $true -Order 3 -ParentHeadingId $commBusiness

$commPricing = Create-Field -Name "Pricing Information" -Type "heading" -Department "commercial" -Order 4
Create-Field -Name "Target Price (USD)" -Type "number" -Department "commercial" -Placeholder "Target selling price" -Order 5 -ParentHeadingId $commPricing
Create-Field -Name "FOB Price (USD)" -Type "number" -Department "commercial" -Placeholder "Free on board price" -Order 6 -ParentHeadingId $commPricing
Create-Field -Name "Minimum Order Quantity" -Type "number" -Department "commercial" -Placeholder "MOQ in pieces" -Order 7 -ParentHeadingId $commPricing

# MMC Department Fields
Write-Host "Creating MMC fields..." -ForegroundColor Yellow
$mmcMaterial = Create-Field -Name "Material Planning" -Type "heading" -Department "mmc" -Order 0
Create-Field -Name "Fabric Consumption (meters)" -Type "number" -Department "mmc" -Placeholder "Fabric required per garment" -IsRequired $true -Order 1 -ParentHeadingId $mmcMaterial
Create-Field -Name "Fabric Width (inches)" -Type "number" -Department "mmc" -Placeholder "Fabric width" -IsRequired $true -Order 2 -ParentHeadingId $mmcMaterial
Create-Field -Name "Fabric Composition" -Type "text" -Department "mmc" -Placeholder "100% Cotton, Cotton blend" -IsRequired $true -Order 3 -ParentHeadingId $mmcMaterial

$mmcTrims = Create-Field -Name "Trims Information" -Type "heading" -Department "mmc" -Order 4
Create-Field -Name "Button Type" -Type "text" -Department "mmc" -Placeholder "Metal, Plastic, Horn" -Order 5 -ParentHeadingId $mmcTrims
Create-Field -Name "Button Quantity" -Type "number" -Department "mmc" -Placeholder "Number of buttons" -Order 6 -ParentHeadingId $mmcTrims
Create-Field -Name "Zipper Type" -Type "text" -Department "mmc" -Placeholder "Metal, Plastic, Invisible" -Order 7 -ParentHeadingId $mmcTrims

$mmcCosting = Create-Field -Name "Costing Breakdown" -Type "heading" -Department "mmc" -Order 8
Create-Field -Name "Fabric Cost" -Type "number" -Department "mmc" -Placeholder "Fabric cost per garment" -Order 9 -ParentHeadingId $mmcCosting
Create-Field -Name "Trims Cost" -Type "number" -Department "mmc" -Placeholder "Total trims cost" -Order 10 -ParentHeadingId $mmcCosting
Create-Field -Name "Labor Cost" -Type "number" -Department "mmc" -Placeholder "Manufacturing labor cost" -Order 11 -ParentHeadingId $mmcCosting

Write-Host ""
Write-Host "✅ Sample fields creation completed!" -ForegroundColor Green
Write-Host "📊 Created fields for all departments with organized sections" -ForegroundColor Cyan
# PowerShell script to create sample fields
$baseUrl = "http://localhost:3000"

# Function to create a field
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
        Write-Host "✗ Failed to create: $Name - $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

Write-Host "Creating sample fields for all departments..." -ForegroundColor Cyan
Write-Host ""

# VMD Department Fields
Write-Host "Creating VMD fields..." -ForegroundColor Yellow

# Create headings first
$vmdBasicInfo = Create-Field -Name "Basic Information" -Type "heading" -Department "vmd" -Order 0
$vmdSampleDetails = Create-Field -Name "Sample Details" -Type "heading" -Department "vmd" -Order 6
$vmdTimeline = Create-Field -Name "Timeline" -Type "heading" -Department "vmd" -Order 10
$vmdConstruction = Create-Field -Name "Construction Details" -Type "heading" -Department "vmd" -Order 14

# Basic Information fields
Create-Field -Name "Brand" -Type "text" -Department "vmd" -Placeholder "e.g., Fashion Co., Style Brand" -IsRequired $true -Order 1 -ParentHeadingId $vmdBasicInfo
Create-Field -Name "Sample Type" -Type "text" -Department "vmd" -Placeholder "Proto, SMS, PP, Salesman" -IsRequired $true -Order 2 -ParentHeadingId $vmdBasicInfo
Create-Field -Name "Style Code" -Type "text" -Department "vmd" -Placeholder "e.g., FC-2025-001" -IsRequired $true -Order 3 -ParentHeadingId $vmdBasicInfo
Create-Field -Name "Style Description" -Type "textarea" -Department "vmd" -Placeholder "Detailed description of the garment style" -IsRequired $true -Order 4 -ParentHeadingId $vmdBasicInfo
Create-Field -Name "Season" -Type "text" -Department "vmd" -Placeholder "SS25, AW25, etc." -Order 5 -ParentHeadingId $vmdBasicInfo

# Sample Details fields
Create-Field -Name "Size" -Type "text" -Department "vmd" -Placeholder "S, M, L, XL or 28, 30, 32" -IsRequired $true -Order 7 -ParentHeadingId $vmdSampleDetails
Create-Field -Name "Quantity (PCS)" -Type "number" -Department "vmd" -Placeholder "Number of pieces required" -IsRequired $true -Order 8 -ParentHeadingId $vmdSampleDetails
Create-Field -Name "Color/Wash" -Type "text" -Department "vmd" -Placeholder "Medium Blue, Stone Wash, Black" -IsRequired $true -Order 9 -ParentHeadingId $vmdSampleDetails

# Timeline fields
Create-Field -Name "Sample Raise Date" -Type "date" -Department "vmd" -IsRequired $true -Order 11 -ParentHeadingId $vmdTimeline
Create-Field -Name "Expected Delivery Date (ETD)" -Type "date" -Department "vmd" -IsRequired $true -Order 12 -ParentHeadingId $vmdTimeline
Create-Field -Name "Urgency Level" -Type "text" -Department "vmd" -Placeholder "Normal, Urgent, Critical" -Order 13 -ParentHeadingId $vmdTimeline

# Construction Details fields
Create-Field -Name "Garment Construction" -Type "text" -Department "vmd" -Placeholder "5 Pocket, 3 Pocket, Shirt style" -Order 15 -ParentHeadingId $vmdConstruction
Create-Field -Name "Fly Details" -Type "text" -Department "vmd" -Placeholder "Zip Fly, Button Fly, No Fly" -Order 16 -ParentHeadingId $vmdConstruction
Create-Field -Name "Costing Required" -Type "boolean" -Department "vmd" -Placeholder "Cost analysis needed" -Order 17 -ParentHeadingId $vmdConstruction

Write-Host ""

# CAD Department Fields
Write-Host "Creating CAD fields..." -ForegroundColor Yellow

# Create headings
$cadTechSpecs = Create-Field -Name "Technical Specifications" -Type "heading" -Department "cad" -Order 0
$cadMeasurements = Create-Field -Name "Key Measurements" -Type "heading" -Department "cad" -Order 5
$cadPattern = Create-Field -Name "Pattern Details" -Type "heading" -Department "cad" -Order 12

# Technical Specifications fields
Create-Field -Name "Pattern Number" -Type "text" -Department "cad" -Placeholder "PAT-2025-001" -IsRequired $true -Order 1 -ParentHeadingId $cadTechSpecs
Create-Field -Name "Fit Type" -Type "text" -Department "cad" -Placeholder "Slim, Regular, Relaxed, Skinny" -IsRequired $true -Order 2 -ParentHeadingId $cadTechSpecs
Create-Field -Name "Size Range" -Type "text" -Department "cad" -Placeholder "28-38, S-XXL" -IsRequired $true -Order 3 -ParentHeadingId $cadTechSpecs
Create-Field -Name "Base Size" -Type "text" -Department "cad" -Placeholder "32, M" -IsRequired $true -Order 4 -ParentHeadingId $cadTechSpecs

# Key Measurements fields
Create-Field -Name "Waist (inches)" -Type "number" -Department "cad" -Placeholder "Waist measurement" -Order 6 -ParentHeadingId $cadMeasurements
Create-Field -Name "Hip (inches)" -Type "number" -Department "cad" -Placeholder "Hip measurement" -Order 7 -ParentHeadingId $cadMeasurements
Create-Field -Name "Inseam (inches)" -Type "number" -Department "cad" -Placeholder "Inseam length" -Order 8 -ParentHeadingId $cadMeasurements
Create-Field -Name "Front Rise (inches)" -Type "number" -Department "cad" -Placeholder "Front rise measurement" -Order 9 -ParentHeadingId $cadMeasurements
Create-Field -Name "Back Rise (inches)" -Type "number" -Department "cad" -Placeholder "Back rise measurement" -Order 10 -ParentHeadingId $cadMeasurements
Create-Field -Name "Leg Opening (inches)" -Type "number" -Department "cad" -Placeholder "Bottom opening width" -Order 11 -ParentHeadingId $cadMeasurements

# Pattern Details fields
Create-Field -Name "Number of Pattern Pieces" -Type "number" -Department "cad" -Placeholder "Total pattern pieces" -Order 13 -ParentHeadingId $cadPattern
Create-Field -Name "Grading Rules" -Type "textarea" -Department "cad" -Placeholder "Size grading specifications" -Order 14 -ParentHeadingId $cadPattern
Create-Field -Name "Seam Allowances" -Type "text" -Department "cad" -Placeholder "1/2 inch, 3/8 inch" -Order 15 -ParentHeadingId $cadPattern

Write-Host ""

# Commercial Department Fields
Write-Host "Creating Commercial fields..." -ForegroundColor Yellow

# Create headings
$commBusiness = Create-Field -Name "Business Information" -Type "heading" -Department "commercial" -Order 0
$commPricing = Create-Field -Name "Pricing and Costing" -Type "heading" -Department "commercial" -Order 6
$commOrder = Create-Field -Name "Order Details" -Type "heading" -Department "commercial" -Order 11

# Business Information fields
Create-Field -Name "Customer/Buyer" -Type "text" -Department "commercial" -Placeholder "Customer name" -IsRequired $true -Order 1 -ParentHeadingId $commBusiness
Create-Field -Name "Inquiry Number" -Type "text" -Department "commercial" -Placeholder "INQ-2025-001" -IsRequired $true -Order 2 -ParentHeadingId $commBusiness
Create-Field -Name "Inquiry Status" -Type "text" -Department "commercial" -Placeholder "New Inquiry, Under Review, Quoted" -IsRequired $true -Order 3 -ParentHeadingId $commBusiness
Create-Field -Name "Sales Representative" -Type "text" -Department "commercial" -Placeholder "Sales person name" -Order 4 -ParentHeadingId $commBusiness
Create-Field -Name "Customer Unit (CU)" -Type "text" -Department "commercial" -Placeholder "CU-001, CU-BRAND-001" -Order 5 -ParentHeadingId $commBusiness

# Pricing and Costing fields
Create-Field -Name "Target Price (USD)" -Type "number" -Department "commercial" -Placeholder "Target selling price" -Order 7 -ParentHeadingId $commPricing
Create-Field -Name "FOB Price (USD)" -Type "number" -Department "commercial" -Placeholder "Free on board price" -Order 8 -ParentHeadingId $commPricing
Create-Field -Name "CM Cost (USD)" -Type "number" -Department "commercial" -Placeholder "Cut and make cost" -Order 9 -ParentHeadingId $commPricing
Create-Field -Name "Fabric Cost (USD)" -Type "number" -Department "commercial" -Placeholder "Fabric cost per unit" -Order 10 -ParentHeadingId $commPricing

# Order Details fields
Create-Field -Name "Minimum Order Quantity" -Type "number" -Department "commercial" -Placeholder "MOQ in pieces" -Order 12 -ParentHeadingId $commOrder
Create-Field -Name "Expected Order Quantity" -Type "number" -Department "commercial" -Placeholder "Expected order size" -Order 13 -ParentHeadingId $commOrder
Create-Field -Name "Delivery Terms" -Type "text" -Department "commercial" -Placeholder "FOB, CIF, EXW" -Order 14 -ParentHeadingId $commOrder
Create-Field -Name "Payment Terms" -Type "text" -Department "commercial" -Placeholder "30% advance, 70% on shipment" -Order 15 -ParentHeadingId $commOrder

Write-Host ""

# MMC Department Fields
Write-Host "Creating MMC fields..." -ForegroundColor Yellow

# Create headings
$mmcMaterial = Create-Field -Name "Material Planning" -Type "heading" -Department "mmc" -Order 0
$mmcTrims = Create-Field -Name "Trims and Accessories" -Type "heading" -Department "mmc" -Order 6
$mmcCosting = Create-Field -Name "Costing Breakdown" -Type "heading" -Department "mmc" -Order 12

# Material Planning fields
Create-Field -Name "Fabric Consumption (meters)" -Type "number" -Department "mmc" -Placeholder "Fabric required per garment" -IsRequired $true -Order 1 -ParentHeadingId $mmcMaterial
Create-Field -Name "Fabric Width (inches)" -Type "number" -Department "mmc" -Placeholder "Fabric width" -IsRequired $true -Order 2 -ParentHeadingId $mmcMaterial
Create-Field -Name "Fabric GSM/Weight" -Type "number" -Department "mmc" -Placeholder "Fabric weight" -Order 3 -ParentHeadingId $mmcMaterial
Create-Field -Name "Fabric Composition" -Type "text" -Department "mmc" -Placeholder "100% Cotton, 98% Cotton 2% Elastane" -IsRequired $true -Order 4 -ParentHeadingId $mmcMaterial
Create-Field -Name "Fabric Shrinkage %" -Type "number" -Department "mmc" -Placeholder "Expected shrinkage percentage" -Order 5 -ParentHeadingId $mmcMaterial

# Trims and Accessories fields
Create-Field -Name "Button Type" -Type "text" -Department "mmc" -Placeholder "Metal, Plastic, Horn" -Order 7 -ParentHeadingId $mmcTrims
Create-Field -Name "Button Quantity" -Type "number" -Department "mmc" -Placeholder "Number of buttons" -Order 8 -ParentHeadingId $mmcTrims
Create-Field -Name "Zipper Type" -Type "text" -Department "mmc" -Placeholder "Metal, Plastic, Invisible" -Order 9 -ParentHeadingId $mmcTrims
Create-Field -Name "Zipper Length (inches)" -Type "number" -Department "mmc" -Placeholder "Zipper length" -Order 10 -ParentHeadingId $mmcTrims
Create-Field -Name "Label Requirements" -Type "textarea" -Department "mmc" -Placeholder "Main label, Care label, Size label" -Order 11 -ParentHeadingId $mmcTrims

# Costing Breakdown fields
Create-Field -Name "Fabric Cost per Meter" -Type "number" -Department "mmc" -Placeholder "Cost per meter" -Order 13 -ParentHeadingId $mmcCosting
Create-Field -Name "Total Fabric Cost" -Type "number" -Department "mmc" -Placeholder "Total fabric cost per garment" -Order 14 -ParentHeadingId $mmcCosting
Create-Field -Name "Trims Cost" -Type "number" -Department "mmc" -Placeholder "Total trims cost" -Order 15 -ParentHeadingId $mmcCosting
Create-Field -Name "Labor Cost" -Type "number" -Department "mmc" -Placeholder "Manufacturing labor cost" -Order 16 -ParentHeadingId $mmcCosting

Write-Host ""
Write-Host "✅ Sample fields creation completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "- VMD: 18 fields (4 sections)" -ForegroundColor White
Write-Host "- CAD: 16 fields (3 sections)" -ForegroundColor White
Write-Host "- Commercial: 16 fields (3 sections)" -ForegroundColor White
Write-Host "- MMC: 17 fields (3 sections)" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Total: 67 fields across all departments" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 Features included:" -ForegroundColor Cyan
Write-Host "- Organized sections with collapsible headings" -ForegroundColor White
Write-Host "- Required field validation" -ForegroundColor White
Write-Host "- Industry-standard field types" -ForegroundColor White
Write-Host "- Realistic placeholders and field names" -ForegroundColor White
Write-Host "- Proper field ordering for logical workflow" -ForegroundColor White
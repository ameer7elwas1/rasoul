# سكريبت رفع المشروع على GitHub
# نظام إدارة الأقساط - مجموعة رسول الرحمة

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "رفع المشروع على GitHub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# الانتقال إلى مجلد المشروع
$projectPath = "d:\Projects\HTML\رسول الرحمة"
Set-Location $projectPath

Write-Host "التحقق من Git..." -ForegroundColor Yellow

# التحقق من وجود Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "خطأ: Git غير مثبت!" -ForegroundColor Red
    Write-Host "يرجى تثبيت Git من: https://git-scm.com/downloads" -ForegroundColor Yellow
    exit 1
}

# تهيئة Git إذا لم يكن موجوداً
if (-not (Test-Path ".git")) {
    Write-Host "تهيئة Git..." -ForegroundColor Yellow
    git init
}

# إضافة جميع الملفات
Write-Host "إضافة الملفات..." -ForegroundColor Yellow
git add .

# عمل Commit
Write-Host "إنشاء Commit..." -ForegroundColor Yellow
$commitMessage = "رفع نظام إدارة الأقساط الكامل - مجموعة رسول الرحمة - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git commit -m $commitMessage

# إضافة Remote إذا لم يكن موجوداً
Write-Host "التحقق من Remote..." -ForegroundColor Yellow
$remoteExists = git remote get-url origin 2>$null
if (-not $remoteExists) {
    Write-Host "إضافة Remote..." -ForegroundColor Yellow
    git remote add origin https://github.com/ameer7elwas1/rasoul.git
} else {
    Write-Host "Remote موجود بالفعل" -ForegroundColor Green
}

# تغيير اسم الفرع إلى main
Write-Host "تغيير اسم الفرع إلى main..." -ForegroundColor Yellow
git branch -M main

# رفع الملفات
Write-Host ""
Write-Host "رفع الملفات على GitHub..." -ForegroundColor Yellow
Write-Host "تحذير: سيتم استبدال جميع الملفات الموجودة!" -ForegroundColor Red
Write-Host ""

$confirm = Read-Host "هل تريد المتابعة؟ (y/n)"
if ($confirm -eq "y" -or $confirm -eq "Y") {
    git push -u origin main --force
    Write-Host ""
    Write-Host "تم رفع المشروع بنجاح!" -ForegroundColor Green
    Write-Host "يمكنك زيارة: https://github.com/ameer7elwas1/rasoul" -ForegroundColor Cyan
} else {
    Write-Host "تم إلغاء العملية" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan


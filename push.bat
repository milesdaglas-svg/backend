@echo off
title AUTO GIT PUSH

echo =========================
echo Adding files...
echo =========================
git add .

echo.
echo =========================
echo Committing...
echo =========================
git commit -m "Auto update"

echo.
echo =========================
echo Pushing to GitHub...
echo =========================
git push

echo.
echo =========================
echo DONE!
echo =========================

pause
Lookback_Defects_By_Priority
============================

Defects by priority chart using the Rally Lookback API.

For stand-alone debugging, generate App-debug.html by running:
rake debug

For deployment within a custom panel in Rally, generate ./deploy/App.html by running:
rake build
You then add the app to Rally by clicking 'Customize Page' on the desired page, 'Add App...', 'Custom HTML' and clicking the 'Add This App' button.
Give your app a title and then paste the contents of ./deploy/App.html into the HTML text area and hit 'Save'.

To run JSLint checks, do the following before running rake build:
export ENABLE_JSLINT='true'

To run the app from outside Rally, you need to run it from Chrome with the cross-site scripting security disabled by doing the following on Windows:

    %LOCALAPPDATA%\Google\Chrome\Application\chrome.exe --disable-web-security --allow-file-access-from-files --allow-cross-origin-auth-prompt

On Mac:

    cd /Applications
    open Google\ Chrome.app --args --disable-web-security --allow-file-access-from-files --allow-cross-origin-auth-prompt

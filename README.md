# UniVision-Voting-Client

The client for managing the voting in UniVision
This client is a custom client for CasparCG graphics engine. It was designed for caspar 2.3, but may work with older HTML supporting version.
This client also connects to the univision.show website via websockets so must have internet access to function.

## Usage

The client is configured for two channels of caspar playback.
The first will have the actual GFX UI.
The second has any transparent overlays that are independent, this includes the lower thrids and the ident.

The starloop button will start a background starloop on channel 1.
The push timer will start a timer that runs to the closest hour (Count.html).
Push and pull acts will push and pull the (acts.html) template.
The Ident button will play an ident on channel 2.
The Reset button will animate out the voting GFX and play an ident on channel 2.

The select button on each segment will animate in the voting GFX for that segment, if it's already open then it will animate to the next section.
The lower third button currently triggers a hardcoded judges lower third, these can be edited by changing and adding them in the (l3rd.js) file in the templates folder.
When a value is selected in the drop down it will be added to the running totals at the bottom and on the admin webpage.
For the value to be shown in the GFX the PUSH button must be pressed. Any pushed GFX will be highlighted green. PULL will animate out the pushed value AND update the total, should only be used when a mistake is made and needs to be changed. 
When a value is PUSHed the rows will auto sort and animate.
When the public totals come in they will update in real time in the client.
The public totals can be pushed firstly by selecting the section, same as the judges, then PUSHing each uni. These will not auto sort.
There is a "Reorder" button in the "Over all totals" section, this has a bug that pressing it more than once will put rows on top of each other. ONLY press this once. It will also break if their order is currently correct...

The Scores Admin tab is the same as the one from the website, in there you can see all incoming votes, can verify and uncount votes and ban IPs via the Ban coloumn.

The Lower Thirds tab will let you push and pull lower thrids and add new ones. It also has the socials poll lower thirds.
The values for these are currently preset in the code and can be edited as bellow

## Tech Details

This is an Electron app, meaning it is essentially a web browser with a nodeJS server running locally.
The Electron window connects to the websocket server and the nodeJS backend connects to the caspar server.
There is then a communication layer via IPC between the front end and the backend.
So when a button is pressed from the client, it triggers an IPC message to the backend which then parses the data and turns it into caspar command that is sent to caspar.

## How to edit and then build the code

Download the source files as a zip, or use git clone.
Install NodeJS (version 16+) I recommend doing this via node version manager (NVM).
This will install node and npm (node package manager).
Via a command line, navigate to the folder which contains the code.
Run "npm install"
Run "npm install electron"
Run "npm install electron-builder"
Now you should be able to type "electron ." and a the terminal will show the logs and the client will open.
If you make changes and want to build it, I would recomend going to the package.json file and changing the version number section at the top.
To run the build, run "npm run build"
I would recomend changing the version number in the package.json file if you are going to run a build.
It may show an error about electron builder, if so, open the package.json file. Find the "dependencies" section and delete the row that has "electron-builder". Make sure the last entry in the block doesn't have a comma after.
It will spend a while building and will create a new .exe in the "dist" folder.

# Welcome to DueUI

This is a lightweight user interface for the Duet family of 3D printing
electronics.  For more information on the Duet products, visit
http://duet3d.com and the forums at http://forum.duet3d.com.

Everyhing you need to know is in the ![DueUI Wiki](https://github.com/gtjoseph/DueUI/wiki)

## Feedback

The entire point of this project was to create something that can be customized
by users.  **If there's something I can do to make that a better experience,
let me know!**  File an issue here or speak up on the [Duet Forums](https://forum.duet3d.com).
I do have a day job ([Asterisk](https://github.com/asterisk/asterisk)) that I love
but I will always have time for this project.

## Contributions

I'm always open to help.  My day job is as a core developer on a pretty active
open-source project so I'm used to working with community contributors.  The
code base isn't complex at all.  There's 1 base class all other components are
based on: DueuiElement.  From there, it's either a DueuiPanel or a DueuiWidget. 
There's still some refactoring work I need to do.  Like all projects, things
done at the start of the project don't always get updated as new things get
added and new techniques get tried. :)  I think I've refactored DueuiButton
about 50 times now.  In the mean time, if there are things that you think
could have been done better, tell me about it or send a pull request. 

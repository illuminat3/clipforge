# clipforge_recorder

## Project structure

This project follows a relatively simple structure.  
When the app starts it will launch the capture class.  
This class will use d3d11 and dxgi to capture the screen.  
This will be captured in small chunks.  
These chunks will be saved to the buffer folder.

As part of the capture class there will be automatic cleanup.  
This will automatically delete files from the buffer based off of the `max_clip_size/chunk_size` where both values are in seconds.

Then there will be 2 actions listened for:

- clip
- recording

The clip button will use the encoder class which will go into the buffer folder and will retrieve all the files in the buffer.  
It will then stitch them together.

The recording button is slightly different.  
It will start directly saving all raw data from the files that are going into the buffer folder directly into the encoder.  
Then when the recording button is pressed again it will save the encoders buffer into the storage folder.

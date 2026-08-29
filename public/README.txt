Put your 3D model here as:  tooth.glb

How to get the Sketchfab "Mouth" model (by TaddyModels):
1. Open the model page on Sketchfab and log in (free account).
2. Click "Download 3D model" and accept the license (CC-BY = credit required).
3. Choose the glTF format. You'll get a .zip.
4. Extract it. Look for a file ending in .glb  (glTF Binary).
   - If you only got scene.gltf + .bin + textures, use an online
     "gltf to glb" converter, or in Blender: File > Import glTF, then
     File > Export > glTF Binary (.glb).
5. Rename that file to  tooth.glb  and drop it in this /public folder.
6. Restart `npm run dev`. The model loads automatically.

If it looks too big/small/rotated, tweak MODEL_TUNING at the top of
src/tooth.js (targetSize / rotation / offset / extraScale).

Attribution is already in the site footer — update the names if you
swap in a different model.

----------------------------------------------------------------------

Doctor photo for the "Meet Dr. Punit" section:  punit.png
- Drop a transparent (or white-bg) cutout PNG here named  punit.png
- Portrait orientation, ideally the doctor standing/adjusting gloves.
- Tall image works best (renders ~500-600px tall on desktop).
- If the file is missing the section still works — the photo just
  stays hidden and the chips/copy show normally.

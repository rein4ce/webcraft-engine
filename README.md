webcraft-engine
===============

Yet another voxel engine, inspired by popular game Minecraft, but!

DEMO
----
https://dl.dropbox.com/u/11531325/voxel/index.html


#### 1. Any tile shapes you want, slopes, spikes, stairs etc. ####

That's right, no more pure blocky blocks, now you can use all sorts of tiles you always wanted: slants, railings, spheres, you name it!
This can help make your terrain smoother and interiors look more detailed. All you have to do is model them in your favorite 3d tool (like SketchUp, sample .skp file already supplied) and define how they should look in-game in one simple .js file and there you go!

#### 2. Baked-in fast ambient occlusion ####

Who needs SSAO when you can just bake vertex colors right into the mesh, right? ;) Neat little feature that will improve the overall visuals of your astounding creations!

#### 3. Automatic removal of occlusing faces ####

More tile types = more difficult to intelligently hide occluded faces between them. Fortunately, this engine will automatically detect which ones occlude which, thus giving you most performance possible

#### 4. Fully client-side, including local save/load ####

No need to deploy anywhere, just fork and play with the code. That is unless you want to permanently store the levels. But there's already a function for that too you can use right away


The beautiful tileset used temporarily is PureDBCraft from Sphex, try it at http://bdcraft.net/ !


_More coming soon..._

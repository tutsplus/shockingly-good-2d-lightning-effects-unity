#pragma strict
import System.Collections.Generic;
class DemoScriptJS extends MonoBehaviour
{
	//Prefabs to be assigned in Editor
	public var BoltPrefab : GameObject;
	public var BranchPrefab : GameObject;

	//For pooling
	var activeBoltsObj : List.<GameObject>;
	var inactiveBoltsObj : List.<GameObject>;
	var maxBolts : int = 1000;

	var scaleText : float;
	var positionText : Vector2;

	//Different modes for the demo
	class Mode
	{
		public static final var bolt : byte = 0;
		public static final var branch : byte = 1;
		public static final var moving : byte = 2;
		public static final var text : byte = 3;
		public static final var nodes : byte = 4;
		public static final var burst : byte = 5;
	}

	//The current mode the demo is in
	var currentMode : byte = Mode.bolt;

	//Will contain all of the pieces for the moving bolt
	var movingBolt : List.<GameObject>;

	//used for actually moving the moving bolt
	var lightningEnd : Vector2 = new Vector2(100, 100);
	var lightningVelocity : Vector2 = new Vector2(1, 0);

	//Will contain all of the pieces for the branches
	var branchesObj : List.<GameObject>;

	//For handling mouse clicks
	var clicks : int = 0;
	var pos1 : Vector2;
	var pos2 : Vector2;
	
	//For storing all of the pixels that need to be drawn by the bolts 
	var textPoints : List.<Vector2>;
	
	//true in text mode
	var shouldText : boolean = false;

	function Start()
	{
		//Initialize lists
		activeBoltsObj = new List.<GameObject>();
		inactiveBoltsObj = new List.<GameObject>();
		branchesObj = new List.<GameObject>();
		
		//for use later
		var tempV3 : Vector3;

		//Grab the parent we'll be assigning to our bolt pool
		var p : GameObject = GameObject.Find("LightningPoolHolder");

		//For however many bolts we've specified
		for(var i : int = 0; i < maxBolts; i++)
		{
			//create from our prefab
			var bolt : GameObject = Instantiate(BoltPrefab);

			//Assign parent
			bolt.transform.parent = p.transform;

			//Initialize our lightning with a preset number of max sexments
			bolt.GetComponent(LightningBoltJS).Initialize(25);

			//Set inactive to start
			bolt.SetActive(false);

			//Store in our inactive list
			inactiveBoltsObj.Add(bolt);
		}

		//Start up a coroutine to capture the pixels we'll be drawing from our text (need the coroutine or error)
		StartCoroutine(TextCapture());
	}

	function Update()
	{
		//Declare variables for use later
		var boltObj : GameObject;
		var boltComponent : LightningBoltJS;
		var i : int;
		var tempV3 : Vector3;
		var adjust : Vector2;
		var branchObj : GameObject;
		var branchComponent : BranchLightningJS;

		//store off the count for effeciency
		var activeLineCount : int = activeBoltsObj.Count;

		//loop through active lines (backwards because we'll be removing from the list)
		for (i = activeLineCount - 1; i >= 0; i--)
		{
			//pull GameObject
			boltObj = activeBoltsObj[i];

			//get the LightningBolt component
			boltComponent = boltObj.GetComponent(LightningBoltJS);

			//if the bolt has faded out
			if(boltComponent.IsComplete())
			{
				//deactive the segments it contains
				boltComponent.DeactivateSegments();

				//set it inactive
				boltObj.SetActive(false);

				//move it to the inactive list
				activeBoltsObj.RemoveAt(i);
				inactiveBoltsObj.Add(boltObj);
			}
		}

		//check for key press and set mode accordingly
		if(Input.GetKeyDown(KeyCode.Alpha1) || Input.GetKeyDown(KeyCode.Keypad1))
		{
			shouldText = false;
			currentMode = Mode.bolt;
		}
		else if(Input.GetKeyDown(KeyCode.Alpha2) || Input.GetKeyDown(KeyCode.Keypad2))
		{
			shouldText = false;
			currentMode = Mode.branch;
		}
		else if(Input.GetKeyDown(KeyCode.Alpha3) || Input.GetKeyDown(KeyCode.Keypad3))
		{
			shouldText = false;
			currentMode = Mode.moving;
		}
		else if(Input.GetKeyDown(KeyCode.Alpha4) || Input.GetKeyDown(KeyCode.Keypad4))
		{
			shouldText = true;
			currentMode = Mode.text;
		}
		else if(Input.GetKeyDown(KeyCode.Alpha5) || Input.GetKeyDown(KeyCode.Keypad5))
		{
			shouldText = false;
			currentMode = Mode.nodes;
		}
		else if(Input.GetKeyDown(KeyCode.Alpha6) || Input.GetKeyDown(KeyCode.Keypad6))
		{
			shouldText = false;
			currentMode = Mode.burst;
		}

		//If left mouse button pressed
		if(Input.GetMouseButtonDown(0))
		{
			//if first click
			if(clicks == 0)
			{
				//store starting position
				tempV3 = Camera.main.ScreenToWorldPoint(Input.mousePosition);
				pos1 = new Vector2(tempV3.x, tempV3.y);
			}
			else if(clicks == 1) //second click
			{
				//store end position
				tempV3 = Camera.main.ScreenToWorldPoint(Input.mousePosition);
				pos2 = new Vector2(tempV3.x, tempV3.y);

				//Handle the current mode appropriately
				switch (currentMode)
				{
					case Mode.bolt:
						//create a (pooled) bolt from pos1 to pos2
						CreatePooledBolt(pos1,pos2, Color.white, 1f);
					break;

					case Mode.branch:
						//instantiate from our branch prefab
						branchObj = GameObject.Instantiate(BranchPrefab);
						
						//get the branch component
						branchComponent = branchObj.GetComponent(BranchLightningJS);

						//initialize the branch component using our position data
						branchComponent.Initialize(pos1, pos2, BoltPrefab);

						//add it to the list of active branches
						branchesObj.Add(branchObj);
					break;

					case Mode.moving:
						//Prevent from getting a 0 magnitude (0 causes errors 
						if(Vector2.Distance(pos1, pos2) <= 0)
						{
							//Try a random position
							adjust = Random.insideUnitCircle;

							//failsafe
							if(adjust.magnitude <= 0) adjust.x += .1f;
							
							//Adjust the end position
							pos2 += adjust;
						}
				
						//Clear out any old moving bolt (this is designed for one moving bolt at a time)
						for(i = movingBolt.Count - 1; i >= 0; i--)
						{
							Destroy(movingBolt[i]);
							movingBolt.RemoveAt(i);
						}
						
						//get the "velocity" so we know what direction to send the bolt in after initial creation
						lightningVelocity = (pos2 - pos1).normalized;

						//instantiate from our bolt prefab
						boltObj = GameObject.Instantiate(BoltPrefab);
						
						//get the bolt component
						boltComponent = boltObj.GetComponent(LightningBoltJS);

						//initialize it with 5 max segments
						boltComponent.Initialize(5);
						
						//activate the bolt using our position data
						boltComponent.ActivateBolt(pos1, pos2, Color.white, 1f);

						//add it to our list
						movingBolt.Add(boltObj);
					break;

					case Mode.burst:
						//get the difference between our two positions (destination - source = vector from source to destination)
						var diff : Vector2 = pos2 - pos1;
						
						//define how many bolts we want in our circle
						var boltsInBurst : int = 10;

						for(i = 0; i < boltsInBurst; i++)
						{
							//rotate around the z axis to the appropriate angle
							var rot : Quaternion = Quaternion.AngleAxis((360f/boltsInBurst) * i, new Vector3(0,0,1));
							
							adjust = rot * diff;

							//Calculate the end position for the bolt
							var boltEnd : Vector2 = adjust + pos1;
							
							//create a (pooled) bolt from pos1 to boltEnd
							CreatePooledBolt(pos1, boltEnd, Color.white, 1f);
						}

					break;
				}
			}

			//increment our tick count
			clicks++;

			//restart the count after 2 clicks
			if(clicks > 1) clicks = 0;
		}

		//if in node mode
		if(currentMode == Mode.nodes)
		{
			//constantly create a (pooled) bolt between the two assigned positions
			CreatePooledBolt(pos1, pos2, Color.white, 1f);
		}

		//loop through any active branches
		for(i = branchesObj.Count - 1; i >= 0; i--)
		{
			branchObj = branchesObj[i];
			
			//pull the branch lightning component
			branchComponent = branchObj.GetComponent(BranchLightningJS);

			//If it's faded out already
			if(branchComponent.IsComplete())
			{
				//destroy it
				Destroy(branchesObj[i]);

				//take it out of our list
				branchesObj.RemoveAt(i);

				//move on to the next branch
				continue;
			}

			//draw and update the branch
			branchComponent.Update();
			branchComponent.Draw();
		}

		//loop through all of our bolts that make up the moving bolt
		for(i = movingBolt.Count - 1; i >= 0; i--)
		{
			boltObj = movingBolt[i];
			//get the bolt component
			boltComponent = boltObj.GetComponent(LightningBoltJS);

			//if the bolt has faded out
			if(boltComponent.IsComplete())
			{
				//destroy it
				Destroy(movingBolt[i]);

				//remove it from our list
				movingBolt.RemoveAt(i);

				//on to the next one, on on to the next one
				continue;
			}

			//update and draw bolt
			boltComponent.Update();
			boltComponent.Draw();
		}

		//if our moving bolt is active
		if(movingBolt.Count > 0)
		{
			boltObj = movingBolt[movingBolt.Count-1];
			//calculate where it currently ends
			lightningEnd = boltObj.GetComponent(LightningBoltJS).End();

			//if the end of the bolt is within 25 units of the camera
			if(Vector2.Distance(lightningEnd,Camera.main.transform.position) < 25)
			{
				//instantiate from our bolt prefab
				boltObj = GameObject.Instantiate(BoltPrefab);

				//get the bolt component
				boltComponent = boltObj.GetComponent(LightningBoltJS);

				//initialize it with a maximum of 5 segments
				boltComponent.Initialize(5);

				//activate the bolt using our position data (from the current end of our moving bolt to the current end + velocity) 
				boltComponent.ActivateBolt(lightningEnd,lightningEnd + lightningVelocity, Color.white, 1f);

				//add it to our list
				movingBolt.Add(boltObj);

				//update and draw our new bolt
				boltComponent.Update();
				boltComponent.Draw();
			}
		}

		//if in text mode
		if(shouldText)
		{
			//go through the points we capture earlier
			for (var i1 : int = 0; i1 < textPoints.Count; i1++)
			{
				var point : Vector2 = textPoints[i1];
				//randomly ignore certain points
				if(Random.Range(0,75) != 0) continue;

				//placeholder values
				var nearestParticle : Vector2 = Vector2.zero;
				var nearestDistSquared : float = float.MaxValue;

				for (i = 0; i < 50; i++)
				{
					//select a random point
					var other : Vector2 = textPoints[Random.Range(0, textPoints.Count)];

					//calculate the distance (squared for performance benefits) between the two points
					var distSquared : float = DistanceSquared(point, other);

					//If this point is the nearest point (but not too near!)
					if (distSquared < nearestDistSquared && distSquared > 3 * 3)
					{
						//store off the data
						nearestDistSquared = distSquared;
						nearestParticle = other;
					}
				}

				//if the point we found isn't too near/far
				if (nearestDistSquared < 25 * 25 && nearestDistSquared > 3 * 3)
				{
					//create a (pooled) bolt at the corresponding screen position
					CreatePooledBolt((point * scaleText) + positionText, (nearestParticle * scaleText) + positionText, Color.white, 1f);
				}
			}
		}

		//update and draw active bolts
		for(i = 0; i < activeBoltsObj.Count; i++)
		{
			boltObj = activeBoltsObj[i];
			boltObj.GetComponent(LightningBoltJS).Update();
			boltObj.GetComponent(LightningBoltJS).Draw();
		}
	}

	//calculate distance squared (no square root = performance boost)
	public function DistanceSquared(a : Vector2, b : Vector2)
	{
		return ((a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y));
	}
	
	function CreatePooledBolt(source : Vector2, dest : Vector2, color : Color, thickness : float)
	{
		//if there is an inactive bolt to pull from the pool
		if(inactiveBoltsObj.Count > 0)
		{
			//pull the GameObject
			var boltObj : GameObject = inactiveBoltsObj[inactiveBoltsObj.Count - 1];

			//set it active
			boltObj.SetActive(true);

			//move it to the active list
			activeBoltsObj.Add(boltObj);
			inactiveBoltsObj.RemoveAt(inactiveBoltsObj.Count - 1);

			//get the bolt component
			var boltComponent : LightningBoltJS =  boltObj.GetComponent(LightningBoltJS);

			//activate the bolt using the given position data
			boltComponent.ActivateBolt(source, dest, color, thickness);
		}
	}

	//Capture the important points of our text for later
	function TextCapture()
	{
		//must wait until end of frame so something is actually drawn or else it will error
		yield WaitForEndOfFrame();

		//get the camera that draws our text
		var cam : Camera = GameObject.Find("TextCamera").GetComponent(Camera);

		//make sure it has an assigned RenderTexture
		if(cam.targetTexture != null) 
		{
			//pull the active RenderTexture
			RenderTexture.active = cam.targetTexture;

			//capture the image into a Texture2D
			var image : Texture2D = new Texture2D(cam.targetTexture.width, cam.targetTexture.height);
			image.ReadPixels(new Rect(0, 0, cam.targetTexture.width, cam.targetTexture.height), 0, 0);
			image.Apply();

			//calculate how the text will be scaled when it is displayed as lightning on the screen
			scaleText = 1 / (cam.ViewportToWorldPoint(new Vector3(1,0,0)).x - cam.ViewportToWorldPoint(Vector3.zero).x);

			//calculate how the text will be positioned when it is displayed as lightning on the screen (centered)
			positionText.x -= image.width * scaleText * .5f;
			positionText.y -= image.height * scaleText * .5f;

			//basically determines how many pixels we skip/check
			var interval : int = 2;

			//loop through pixels
			for(var y : int = 0; y < image.height; y += interval)
			{
				for(var x : int = 0; x < image.width; x += interval)
				{
					//get the color of the pixel
					var color : Color = image.GetPixel(x,y);

					//if the color has an r (red) value
					if(color.r > 0)
					{
						//add it to our points for drawing
						textPoints.Add(new Vector2(x,y));
					}
				}
			}
		}
	}
}
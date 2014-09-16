using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class DemoScript : MonoBehaviour 
{
	//Prefabs to be assigned in Editor
	public GameObject BoltPrefab;
	public GameObject BranchPrefab;

	//For pooling
	List<GameObject> activeBoltsObj;
	List<GameObject> inactiveBoltsObj;
	int maxBolts = 1000;

	float scaleText;
	Vector2 positionText;

	//Different modes for the demo
	enum Mode : byte
	{
		bolt,
		branch,
		moving,
		text,
		nodes,
		burst
	}

	//The current mode the demo is in
	Mode currentMode = Mode.bolt;

	//Will contain all of the pieces for the moving bolt
	List<GameObject> movingBolt = new List<GameObject>();

	//used for actually moving the moving bolt
	Vector2 lightningEnd = new Vector2(100, 100);
	Vector2 lightningVelocity = new Vector2(1, 0);

	//Will contain all of the pieces for the branches
	List<GameObject> branchesObj;

	//For handling mouse clicks
	int clicks = 0;
	Vector2 pos1, pos2;
	
	//For storing all of the pixels that need to be drawn by the bolts 
	List<Vector2> textPoints = new List<Vector2>();
	
	//true in text mode
	bool shouldText = false;

	void Start()
	{
		//Initialize lists
		activeBoltsObj = new List<GameObject>();
		inactiveBoltsObj = new List<GameObject>();
		branchesObj = new List<GameObject>();

		//Grab the parent we'll be assigning to our bolt pool
		GameObject p = GameObject.Find("LightningPoolHolder");

		//For however many bolts we've specified
		for(int i = 0; i < maxBolts; i++)
		{
			//create from our prefab
			GameObject bolt = (GameObject)Instantiate(BoltPrefab);

			//Assign parent
			bolt.transform.parent = p.transform;

			//Initialize our lightning with a preset number of max sexments
			bolt.GetComponent<LightningBolt>().Initialize(25);

			//Set inactive to start
			bolt.SetActive(false);

			//Store in our inactive list
			inactiveBoltsObj.Add(bolt);
		}

		//Start up a coroutine to capture the pixels we'll be drawing from our text (need the coroutine or error)
		StartCoroutine(TextCapture());
	}

	void Update()
	{
		//Declare variables for use later
		GameObject boltObj;
		LightningBolt boltComponent;

		//store off the count for effeciency
		int activeLineCount = activeBoltsObj.Count;

		//loop through active lines (backwards because we'll be removing from the list)
		for (int i = activeLineCount - 1; i >= 0; i--)
		{
			//pull GameObject
			boltObj = activeBoltsObj[i];

			//get the LightningBolt component
			boltComponent = boltObj.GetComponent<LightningBolt>();

			//if the bolt has faded out
			if(boltComponent.IsComplete)
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
				Vector3 temp = Camera.main.ScreenToWorldPoint(Input.mousePosition);
				pos1 = new Vector2(temp.x, temp.y);
			}
			else if(clicks == 1) //second click
			{
				//store end position
				Vector3 temp = Camera.main.ScreenToWorldPoint(Input.mousePosition);
				pos2 = new Vector2(temp.x, temp.y);

				//Handle the current mode appropriately
				switch (currentMode)
				{
					case Mode.bolt:
						//create a (pooled) bolt from pos1 to pos2
						CreatePooledBolt(pos1,pos2, Color.white, 1f);
					break;

					case Mode.branch:
						//instantiate from our branch prefab
						GameObject branchObj = (GameObject)GameObject.Instantiate(BranchPrefab);
						
						//get the branch component
						BranchLightning branchComponent = branchObj.GetComponent<BranchLightning>();

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
							Vector2 adjust = Random.insideUnitCircle;

							//failsafe
							if(adjust.magnitude <= 0) adjust.x += .1f;
							
							//Adjust the end position
							pos2 += adjust;
						}
				
						//Clear out any old moving bolt (this is designed for one moving bolt at a time)
						for(int i = movingBolt.Count - 1; i >= 0; i--)
						{
							Destroy(movingBolt[i]);
							movingBolt.RemoveAt(i);
						}
						
						//get the "velocity" so we know what direction to send the bolt in after initial creation
						lightningVelocity = (pos2 - pos1).normalized;

						//instantiate from our bolt prefab
						boltObj = (GameObject)GameObject.Instantiate(BoltPrefab);
						
						//get the bolt component
						boltComponent = boltObj.GetComponent<LightningBolt>();

						//initialize it with 5 max segments
						boltComponent.Initialize(5);
						
						//activate the bolt using our position data
						boltComponent.ActivateBolt(pos1, pos2, Color.white, 1f);

						//add it to our list
						movingBolt.Add(boltObj);
					break;

					case Mode.burst:
						//get the difference between our two positions (destination - source = vector from source to destination)
						Vector2 diff = pos2 - pos1;
						
						//define how many bolts we want in our circle
						int boltsInBurst = 10;

						for(int i = 0; i < boltsInBurst; i++)
						{
							//rotate around the z axis to the appropriate angle
							Quaternion rot = Quaternion.AngleAxis((360f/boltsInBurst) * i, new Vector3(0,0,1));

							//Calculate the end position for the bolt
							Vector2 boltEnd = (Vector2)(rot * diff) + pos1;
							
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
		for(int i = branchesObj.Count - 1; i >= 0; i--)
		{
			//pull the branch lightning component
			BranchLightning branchComponent = branchesObj[i].GetComponent<BranchLightning>();

			//If it's faded out already
			if(branchComponent.IsComplete)
			{
				//destroy it
				Destroy(branchesObj[i]);

				//take it out of our list
				branchesObj.RemoveAt(i);

				//move on to the next branch
				continue;
			}

			//draw and update the branch
			branchComponent.UpdateBranch();
			branchComponent.Draw();
		}

		//loop through all of our bolts that make up the moving bolt
		for(int i = movingBolt.Count - 1; i >= 0; i--)
		{
			//get the bolt component
			boltComponent = movingBolt[i].GetComponent<LightningBolt>();

			//if the bolt has faded out
			if(boltComponent.IsComplete)
			{
				//destroy it
				Destroy(movingBolt[i]);

				//remove it from our list
				movingBolt.RemoveAt(i);

				//on to the next one, on on to the next one
				continue;
			}

			//update and draw bolt
			boltComponent.UpdateBolt();
			boltComponent.Draw();
		}

		//if our moving bolt is active
		if(movingBolt.Count > 0)
		{
			//calculate where it currently ends
			lightningEnd = movingBolt[movingBolt.Count-1].GetComponent<LightningBolt>().End;

			//if the end of the bolt is within 25 units of the camera
			if(Vector2.Distance(lightningEnd,(Vector2)Camera.main.transform.position) < 25)
			{
				//instantiate from our bolt prefab
				boltObj = (GameObject)GameObject.Instantiate(BoltPrefab);

				//get the bolt component
				boltComponent = boltObj.GetComponent<LightningBolt>();

				//initialize it with a maximum of 5 segments
				boltComponent.Initialize(5);

				//activate the bolt using our position data (from the current end of our moving bolt to the current end + velocity) 
				boltComponent.ActivateBolt(lightningEnd,lightningEnd + lightningVelocity, Color.white, 1f);

				//add it to our list
				movingBolt.Add(boltObj);

				//update and draw our new bolt
				boltComponent.UpdateBolt();
				boltComponent.Draw();
			}
		}

		//if in text mode
		if(shouldText)
		{
			//go through the points we capture earlier
			foreach (Vector2 point in textPoints)
			{
				//randomly ignore certain points
				if(Random.Range(0,75) != 0) continue;

				//placeholder values
				Vector2 nearestParticle = Vector2.zero;
				float nearestDistSquared = float.MaxValue;

				for (int i = 0; i < 50; i++)
				{
					//select a random point
					Vector2 other = textPoints[Random.Range(0, textPoints.Count)];

					//calculate the distance (squared for performance benefits) between the two points
					float distSquared = DistanceSquared(point, other);

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
					CreatePooledBolt((point * scaleText) + positionText, (nearestParticle * scaleText) + positionText, new Color(Random.value,Random.value,Random.value,1f), 1f);
				}
			}
		}

		//update and draw active bolts
		for(int i = 0; i < activeBoltsObj.Count; i++)
		{
			activeBoltsObj[i].GetComponent<LightningBolt>().UpdateBolt();
			activeBoltsObj[i].GetComponent<LightningBolt>().Draw();
		}
	}

	//calculate distance squared (no square root = performance boost)
	public float DistanceSquared(Vector2 a, Vector2 b)
	{
		return ((a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y));
	}
	
	void CreatePooledBolt(Vector2 source, Vector2 dest, Color color, float thickness)
	{
		//if there is an inactive bolt to pull from the pool
		if(inactiveBoltsObj.Count > 0)
		{
			//pull the GameObject
			GameObject boltObj = inactiveBoltsObj[inactiveBoltsObj.Count - 1];

			//set it active
			boltObj.SetActive(true);

			//move it to the active list
			activeBoltsObj.Add(boltObj);
			inactiveBoltsObj.RemoveAt(inactiveBoltsObj.Count - 1);

			//get the bolt component
			LightningBolt boltComponent =  boltObj.GetComponent<LightningBolt>();

			//activate the bolt using the given position data
			boltComponent.ActivateBolt(source, dest, color, thickness);
		}
	}

	//Capture the important points of our text for later
	IEnumerator TextCapture()
	{
		//must wait until end of frame so something is actually drawn or else it will error
		yield return new WaitForEndOfFrame();

		//get the camera that draws our text
		Camera cam = GameObject.Find("TextCamera").GetComponent<Camera>();

		//make sure it has an assigned RenderTexture
		if(cam.targetTexture != null) 
		{
			//pull the active RenderTexture
			RenderTexture.active = cam.targetTexture;

			//capture the image into a Texture2D
			Texture2D image = new Texture2D(cam.targetTexture.width, cam.targetTexture.height);
			image.ReadPixels(new Rect(0, 0, cam.targetTexture.width, cam.targetTexture.height), 0, 0);
			image.Apply();

			//calculate how the text will be scaled when it is displayed as lightning on the screen
			scaleText = 1 / (cam.ViewportToWorldPoint(new Vector3(1,0,0)).x - cam.ViewportToWorldPoint(Vector3.zero).x);

			//calculate how the text will be positioned when it is displayed as lightning on the screen (centered)
			positionText.x -= image.width * scaleText * .5f;
			positionText.y -= image.height * scaleText * .5f;

			//basically determines how many pixels we skip/check
			const int interval = 2;

			//loop through pixels
			for(int y = 0; y < image.height; y += interval)
			{
				for(int x = 0; x < image.width; x += interval)
				{
					//get the color of the pixel
					Color color = image.GetPixel(x,y);

					//if the color has any r (red) value
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
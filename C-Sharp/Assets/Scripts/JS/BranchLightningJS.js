#pragma strict
import System.Collections.Generic;
class BranchLightningJS extends MonoBehaviour
{
	//For holding all of our bolts in our branch
	public var boltsObj : List.<GameObject>;

	//If there are no bolts, then the branch is complete (we're not pooling here, but you could if you wanted)
	public function IsComplete()
	{ 
		return boltsObj.Count <= 0;
	}

	//Start position of branch
	public var Start : Vector2;

	//End position of branch
	public var End : Vector2;
	
	static var rand : Random = new Random();

	public function Initialize(start : Vector2, end : Vector2, boltPrefab : GameObject)
	{
		//for use lateer
		var i : int;
		
		//store start and end positions
		Start = start;
		End = end;

		//create the  main bolt from our bolt prefab
		var mainBoltObj : GameObject = GameObject.Instantiate(boltPrefab);

		//get the LightningBolt component
		var mainBoltComponent : LightningBoltJS = mainBoltObj.GetComponent(LightningBoltJS);

		//initialize our bolt with a max of 5 segments
		mainBoltComponent.Initialize(5);

		//activate the bolt with our position data
		mainBoltComponent.ActivateBolt(start, end, Color.white, 1f);

		//add it to our list
		boltsObj.Add(mainBoltObj);

		//randomly determine how many sub branches there will be (3-6)
		var numBranches : int = Random.Range(3,6);

		//calculate the difference between our start and end points
		var diff : Vector2 = end - start;
		
		// pick a bunch of random points between 0 and 1 and sort them
		var branchPoints : List.<float> = new List.<float>();
		for(i = 0; i < numBranches; i++) branchPoints.Add(Random.value);
		branchPoints.Sort();

		//go through those points
		for (i = 0; i < branchPoints.Count; i++)
		{
			// Bolt.GetPoint() gets the position of the lightning bolt based on the percentage passed in (0 = start of bolt, 1 = end)
			var boltStart : Vector2 = mainBoltComponent.GetPoint(branchPoints[i]);

			//get rotation of 30 degrees. Alternate between rotating left and right. (i & 1 will be true for all odd numbers...yay bitwise operators!)
			var rot : Quaternion = Quaternion.AngleAxis(30 * ((i & 1) == 0 ? 1 : -1), new Vector3(0,0,1));

			var point : float = branchPoints[i];
			
			//calculate how much to adjust for our end position
			var adjust : Vector2 = rot * (Random.Range(.5f, .75f) * diff * (1 - point));

			//get the end position
			var boltEnd : Vector2 = adjust + boltStart;

			//instantiate from our bolt prefab
			var boltObj : GameObject = GameObject.Instantiate(boltPrefab);

			//get the LightningBolt component
			var boltComponent : LightningBoltJS = boltObj.GetComponent(LightningBoltJS);

			//initialize our bolt with a max of 5 segments
			boltComponent.Initialize(5);

			//activate the bolt with our position data
			boltComponent.ActivateBolt(boltStart, boltEnd, Color.white, 1f);

			//add it to the list
			boltsObj.Add(boltObj);
		}
	}
	
	public function Update()
	{
		//go through our active bolts
		for (var i : int = boltsObj.Count - 1; i >= 0; i--)
		{
			//get the GameObject
			var boltObj : GameObject = boltsObj[i];

			//get the LightningBolt component
			var boltComp : LightningBoltJS = boltObj.GetComponent(LightningBoltJS);

			//update/fade out the bolt
			boltComp.Update();

			//if the bolt has faded
			if(boltComp.IsComplete())
			{
				//remove it from our list
				boltsObj.RemoveAt(i);

				//destroy it (would be better to pool but I'll let you figure out how to do that =P)
				Destroy(boltObj);
			}
		}
	}

	//Draw our active bolts on screen
	public function Draw()
	{
		var boltObj : GameObject;
		for(var i : int; i < boltsObj.Count; i++)
		{
			boltObj = boltsObj[i];
			boltObj.GetComponent(LightningBoltJS).Draw();
		}
	}
}
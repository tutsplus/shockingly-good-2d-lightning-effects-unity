using UnityEngine;
using System.Collections.Generic;

class BranchLightning : MonoBehaviour
{
	//For holding all of our bolts in our branch
	List<GameObject> boltsObj = new List<GameObject>();

	//If there are no bolts, then the branch is complete (we're not pooling here, but you could if you wanted)
	public bool IsComplete { get { return boltsObj.Count == 0; } }

	//Start position of branch
	public Vector2 Start { get; private set; }

	//End position of branch
	public Vector2 End { get; private set; }
	
	static Random rand = new Random();

	public void Initialize(Vector2 start, Vector2 end, GameObject boltPrefab)
	{
		//store start and end positions
		Start = start;
		End = end;

		//create the  main bolt from our bolt prefab
		GameObject mainBoltObj = (GameObject)GameObject.Instantiate(boltPrefab);

		//get the LightningBolt component
		LightningBolt mainBoltComponent = mainBoltObj.GetComponent<LightningBolt>();

		//initialize our bolt with a max of 5 segments
		mainBoltComponent.Initialize(5);

		//activate the bolt with our position data
		mainBoltComponent.ActivateBolt(start, end, Color.white, 1f);

		//add it to our list
		boltsObj.Add(mainBoltObj);

		//randomly determine how many sub branches there will be (3-6)
		int numBranches = Random.Range(3,6);

		//calculate the difference between our start and end points
		Vector2 diff = end - start;
		
		// pick a bunch of random points between 0 and 1 and sort them
		List<float> branchPoints = new List<float>();
		for(int i = 0; i < numBranches; i++) branchPoints.Add(Random.value);
		branchPoints.Sort();

		//go through those points
		for (int i = 0; i < branchPoints.Count; i++)
		{
			// Bolt.GetPoint() gets the position of the lightning bolt based on the percentage passed in (0 = start of bolt, 1 = end)
			Vector2 boltStart = mainBoltComponent.GetPoint(branchPoints[i]);

			//get rotation of 30 degrees. Alternate between rotating left and right. (i & 1 will be true for all odd numbers...yay bitwise operators!)
			Quaternion rot = Quaternion.AngleAxis(30 * ((i & 1) == 0 ? 1 : -1), new Vector3(0,0,1));

			//calculate how much to adjust for our end position
			Vector2 adjust = rot * (Random.Range(.5f, .75f) * diff * (1 - branchPoints[i]));

			//get the end position
			Vector2 boltEnd = adjust + boltStart;

			//instantiate from our bolt prefab
			GameObject boltObj = (GameObject)GameObject.Instantiate(boltPrefab);

			//get the LightningBolt component
			LightningBolt boltComponent = boltObj.GetComponent<LightningBolt>();

			//initialize our bolt with a max of 5 segments
			boltComponent.Initialize(5);

			//activate the bolt with our position data
			boltComponent.ActivateBolt(boltStart, boltEnd, Color.white, 1f);

			//add it to the list
			boltsObj.Add(boltObj);
		}
	}
	
	public void UpdateBranch()
	{
		//go through our active bolts
		for (int i = boltsObj.Count - 1; i >= 0; i--)
		{
			//get the GameObject
			GameObject boltObj = boltsObj[i];

			//get the LightningBolt component
			LightningBolt boltComp = boltObj.GetComponent<LightningBolt>();

			//update/fade out the bolt
			boltComp.UpdateBolt();

			//if the bolt has faded
			if(boltComp.IsComplete)
			{
				//remove it from our list
				boltsObj.RemoveAt(i);

				//destroy it (would be better to pool but I'll let you figure out how to do that =P)
				Destroy(boltObj);
			}
		}
	}

	//Draw our active bolts on screen
	public void Draw()
	{
		foreach (GameObject boltObj in boltsObj)
		{
			boltObj.GetComponent<LightningBolt>().Draw();
		}
	}
}
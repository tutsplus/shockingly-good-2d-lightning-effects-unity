#pragma strict
import System.Collections.Generic;
class LightningBoltJS extends MonoBehaviour
{	
	//List of all of our active/inactive lines
	public var ActiveLineObj : List.<GameObject>;
	public var InactiveLineObj : List.<GameObject>;

	//Prefab for a line
	public var LinePrefab : GameObject;

	//Transparency
	public var Alpha : float;

	//The speed at which our bolts will fade out
	public var FadeOutRate : float;

	//The color of our bolts
	public var Tint : Color;

	//The position where our bolt started
	public function Start()
	{
		var first : GameObject = ActiveLineObj[0];
		return first.GetComponent(LineJS).A;
	}
	
	//The position where our bolt ended
	public function End()
	{
		var last : GameObject = ActiveLineObj[ActiveLineObj.Count-1];
		return last.GetComponent(LineJS).B;
	}

	//True if the bolt has completely faded out
	public function IsComplete()
	{ 
		return Alpha <= 0; 
	}
	
	public function Initialize(maxSegments : int)
	{
		//Initialize lists for pooling
		ActiveLineObj = new List.<GameObject>();
		InactiveLineObj = new List.<GameObject>();

		for(var i : int = 0; i < maxSegments; i++)
		{
			//instantiate from our Line Prefab
			var line : GameObject = GameObject.Instantiate(LinePrefab);

			//parent it to our bolt object
			line.transform.parent = transform;

			//set it inactive
			line.SetActive(false);

			//add it to our list
			InactiveLineObj.Add(line);
		}
	}

	public function ActivateBolt(source : Vector2, dest : Vector2, color : Color, thickness : float)
	{
		//for use in loops later
		var i : int;
	
		//Store tint
		Tint = color;
		
		//Store alpha
		Alpha = 1.5f;
		
		//Store fade out rate
		FadeOutRate = 0.03f;

		//actually create the bolt
		//Prevent from getting a 0 magnitude
		if(Vector2.Distance(dest, source) <= 0)
		{
			var adjust : Vector2 = Random.insideUnitCircle;
			if(adjust.magnitude <= 0) adjust.x += .1f;
			dest += adjust;
		}
		
		//difference from source to destination
		var slope : Vector2 = dest - source;
		var normal : Vector2 = (new Vector2(slope.y, -slope.x)).normalized;
		
		//distance between source and destination
		var distance : float = slope.magnitude;
		
		var positions : List.<float> = new List.<float>();
		positions.Add(0);
		
		for (i = 0; i < distance / 4; i++) 
		{
			//Generate random positions between 0 and 1 to break up the bolt
			//positions.Add (Random.Range(0f, 1f));
			positions.Add(Random.Range(.25f, .75f));
		}
		positions.Sort();
		
		var Sway : float = 80;
		var Jaggedness : float = 1 / Sway;
		
		//Affects how wide the bolt is allowed to spread
		var spread : float = 1f;
		
		//Start at the source
		var prevPoint : Vector2 = source;
		
		//No previous displacement, so just 0
		var prevDisplacement : float = 0;
		
		for (i = 1; i < positions.Count; i++)
		{
			//don't allow more than we have in the pool
			var inactiveCount : int = InactiveLineObj.Count;
			if(inactiveCount <= 0) break;
			
			var pos : float = positions[i];
			var prevPos : float = positions[i - 1];
			//used to prevent sharp angles by ensuring very close positions also have small perpendicular variation.
			var scale : float = (distance * Jaggedness) * (pos - prevPos);
			
			//defines an envelope. Points near the middle of the bolt can be further from the central line.
			var envelope : float = pos > 0.95f ? 20 * (1 - pos) : spread;
			
			//calculate the displacement
			var displacement : float = Random.Range(-Sway, Sway);
			displacement -= (displacement - prevDisplacement) * (1 - scale);
			displacement *= envelope;
			
			//Calculate the end point
			var point : Vector2 = source + (pos * slope) + (displacement * normal);
			
			activateLine(prevPoint, point, thickness);
			prevPoint = point;
			prevDisplacement = displacement;
		}
		
		activateLine(prevPoint, dest, thickness);
	}
	
	public function DeactivateSegments()
	{
		for(var i : int = ActiveLineObj.Count - 1; i >= 0; i--)
		{
			var line : GameObject = ActiveLineObj[i];
			line.SetActive(false);
			
			ActiveLineObj.RemoveAt(i);
			InactiveLineObj.Add(line);
		}
	}

	function activateLine(A : Vector2, B : Vector2, thickness : float)
	{
		//get the inactive count
		var inactiveCount : int = InactiveLineObj.Count;
		
		//only activate if we can pull from inactive
		if(inactiveCount <= 0) return;

		//pull the GameObject
		var lineObj : GameObject = InactiveLineObj[InactiveLineObj.Count - 1];

		//set it active
		lineObj.SetActive(true);
		
		//get the Line component
		var lineComponent : LineJS = lineObj.GetComponent(LineJS);
		lineComponent.SetColor(Color.white);
		lineComponent.A = A;
		lineComponent.B = B;
		lineComponent.Thickness = thickness;
		ActiveLineObj.Add(lineObj);
		InactiveLineObj.Remove(lineObj);
	}
	
	public function Draw()
	{
		//if the bolt has faded out, no need to draw
		if (Alpha <= 0) return;

		for(var i : int = 0; i < ActiveLineObj.Count; i++)
		{
			var obj : GameObject = ActiveLineObj[i];
			var lineComponent : LineJS = obj.GetComponent(LineJS);
			lineComponent.SetColor(Tint * (Alpha * 0.6f));
			lineComponent.Draw();
		}
	}
	
	public function Update()
	{
		Alpha -= FadeOutRate;
	}

	// Returns the point where the bolt is at a given fraction of the way through the bolt. Passing
	// zero will return the start of the bolt, and passing 1 will return the end.
	public function GetPoint(position : float)
	{
		var start : Vector2 = Start();
		var length : float = Vector2.Distance(start, End());
		var dir : Vector2 = (End() - start) / length;
		position *= length;

		var line : LineJS;
		
		//find the appropriate line
		for(var i : int = 0; i < ActiveLineObj.Count; i++)
		{
			var x : GameObject = ActiveLineObj[i];
			
			if(Vector2.Dot(x.GetComponent(LineJS).B - start, dir) >= position)
			{
				line = x.GetComponent(LineJS);
				break;
			}
			
		}
		var lineStartPos : float = Vector2.Dot(line.A - start, dir);
		var lineEndPos : float = Vector2.Dot(line.B - start, dir);
		var linePos : float = (position - lineStartPos) / (lineEndPos - lineStartPos);
		
		return Vector2.Lerp(line.A, line.B, linePos);
	}
}